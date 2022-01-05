
const express = require('express')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 80;
const dbAddress = ''

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('trust proxy', true)

app.listen(port, () => {
  	console.log(`App listening at port ${port}`)
});

const postModel = mongoose.model("Post", mongoose.Schema({
    postId: {
        type: Number,
        required: true
    },
    postDate: Date,
    responseId: Number,
    postTitle: String,
    postContent: String,
    postReplies: Number,
    postImage: String
}));

let nextPostId;
let adminPassword;

let homepagePostsCache = {
    data: null,
    lastRefresh: null,
    refreshTimeout: 10000 
}

const limits = {
    title: 50,
    content: 500, 
    image: 100000
}

app.get('/post/:id', (req, res) => {
	res.sendFile('public/post.html', {root: __dirname })
});

app.get('/postInfo/:id', (req, res) => {
    let postId = req.params.id

    if (isNaN(postId) || parseFloat(postId) >= nextPostId) {
        res.send(makePayload(null,'Viestiä ei löytynyt.'))
        return;
    }

    postModel.findOne({postId: postId}, (err, thisPost) => {
        if (err || !thisPost) {
            res.send(makePayload(null, 'Viestiä ei löytynyt.'))
            return;
        } 

        if ('responseId' in thisPost && thisPost.responseId) {
            // Post is not main post; get main post then replies
            postModel.findOne({postId: thisPost.responseId}, (err, mainPost) => {
                if (err) {
                    res.send(makePayload(null, 'Viestiä ei pystytty lataamaan.'));
                    return;
                }
                postModel.find({responseId: mainPost.postId}, (err, postReplies) => {
                    if (err) {
                        res.send(makePayload(null, 'Viestiä ei pystytty lataamaan.'))
                        return;
                    }
                    let allPosts = [mainPost].concat(postReplies)
                    res.send(makePayload(allPosts, null))
                });
            })
        } else {
            //Post is main post; get replies
            postModel.find({responseId: thisPost.postId}, (err, postReplies) => {
                if (err) {
                    res.send('Viestiä ei pystytty lataamaan.')
                } else {
                    let allPosts = [thisPost].concat(postReplies)
                    res.send(makePayload(allPosts, null))
                }
            });
        }
    });
});

app.get('/homepagePosts', (req, res) => {
    if (homepagePostsCache.data && Date.now() - homepagePostsCache.lastRefresh <= homepagePostsCache.refreshTimeout) {
        res.send(homepagePostsCache.data);
        return;
    }

    let latestPostsPromise = new Promise(resolve => {
        postModel.find({responseId: null}).sort({postDate: -1}).limit(10).exec((err, posts) => {
            if (err || !posts) {
                resolve(makePayload(null, 'Viestejä ei löytynyt.'))
            } else {
                resolve(makePayload(posts, null))
            }
        });
    });

    let popularPostsPromise = new Promise(resolve => {
        postModel.find({responseId: null}).sort({postReplies: -1}).limit(10).exec((err, posts) => {
            if (err || !posts) {
                resolve(makePayload(null, 'Viestejä ei löytynyt.'))
            } else {
                resolve(makePayload(posts, null))
            }
        });
    });

    let newMessagesCountPromise = new Promise(resolve => {
        let dateHourAgo = new Date()
        dateHourAgo.setTime(dateHourAgo.getTime() - 3600000)

        postModel.count({'postDate' : { $gte : dateHourAgo}}, (err, count) => {
            if (err) {
                resolve(makePayload(null, 'Viimeisiä viestejä ei pystytty laskemaan.' + err.toString()));
            } else {
                resolve(makePayload(count, null));
            }
        });
    });

    Promise.all([latestPostsPromise, popularPostsPromise, newMessagesCountPromise]).then(values => {
        homepagePostsCache.data = {latest: values[0], popular: values[1], newMessagesCount: values[2]}
        homepagePostsCache.lastRefresh = Date.now();
        res.send(homepagePostsCache.data)
    })
});

app.post('/createPost', (req, res) => {
    let post = req.body;

    if (!('postTitle' in post) || !('postContent' in post) || !post.postTitle || !post.postContent) {
        res.send(makePayload(null, 'Otsikko ja viesti eivät voi olla tyhjiä.'))
        return;
    }

    if (post.postTitle > limits.title || post.postContent.length > limits.content) {
        res.send(makePayload(null, 'Liian pitkä viesti.'))
        return;
    }

    if ('postImage' in post && post.postImage > limits.image) {
        res.send('Kuva on liian suuri.');
        return;
    }

    const newPost = new postModel({
        postId: nextPostId,
        postDate: new Date(),
        responseId: null,
        postTitle: sanitizeString(post.postTitle),
        postContent: sanitizeString(post.postContent),
        postReplies: 0,
        postImage: sanitizeString(post.postImage)
    });
    savePost(newPost).then(status => {res.send(status)})
});

app.post('/createReply', (req, res) => {
    let replyPost = req.body;

    if (!('postContent' in replyPost) || !replyPost.postContent || !('responseId' in replyPost) || !replyPost.responseId) {
        res.send(makePayload(null, 'Viesti ei voi olla tyhjiä.'))
        return;
    } 

    if (replyPost.postContent.length > limits.content) {
        res.send(makePayload(null, 'Liian pitkä viesti.'))
        return;
    }

    if ('postImage' in replyPost && replyPost.postImage > limits.image) {
        res.send('Kuva on liian suuri.');
        return;
    }

    postModel.findOne({postId: replyPost.responseId}, (err, mainPost) => {
        if (err || !mainPost) {
            res.send(makePayload(null, 'Yritit vastata viestiin, jota ei ole olemassa.'))
            return;
        } 

        const newPost = new postModel({
            postId: nextPostId,
            postDate: new Date(),
            responseId: mainPost.postId,
            postTitle: null,
            postContent: sanitizeString(replyPost.postContent),
            postReplies: 0,
            postImage: sanitizeString(replyPost.postImage)
        })
        savePost(newPost).then(status => {
            res.send(status)
            if (status.err) return;
            mainPost.postReplies += 1;
            mainPost.save()
        })
    })
});

app.post('/mods', (req, res) => {
    let password = req.body.text;
    
    if ((password && password === adminPassword)) {
        res.send(true)
        console.log('Moderator approved.')
    } else {
        res.send(false)
    }
});

app.post('/deletePost', (req, res) => {
    let password = req.body.text;
    let postId = req.body.id
    if (password && password === adminPassword) {

        postModel.findOne({postId: postId}, (err, post) => {
            if (err || !post) return

            if (post.responseId) {
                post.postTitle = ''
                post.postContent = 'Viesti poistettu'
            } else {
                post.postTitle = 'Viesti poistettu';
                post.postContent = ''
            }
            post.postImage = null;
            
            post.save(err => {
                if (err) return;
                res.send(true)
            });
        });

    } else {
        res.send(false)
    }
});

function sanitizeString(text) {
    return text.replace(/<[^>]*>?/gm, '');
}

function makePayload(data, err) {
    return {data: data, err: err}
}

function savePost(post) {
    return post.save().then(post => {
        nextPostId += 1;
        return makePayload(post.postId, null);
    });
}

function generateRandomString(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

mongoose.connect(dbAddress, {useNewUrlParser: true, useUnifiedTopology: true}).then(
    () => {
        console.log("Database connection state: " + mongoose.connection.readyState);

        postModel.count({}, (err, count) => {
            if (err) {
                console.log('Could not retrieve last post id.')
            } else {
                nextPostId = count + 1

                console.log('The next post id is: ' + nextPostId.toString())

                adminPassword = generateRandomString(15)
                console.log('The admin password is: ' + adminPassword.toString())
            }
        });

        
    },
    (err) => {
        console.log("Database error:" + err)
    }
);

// heroku logs -t -s app -a aalto-lauta 