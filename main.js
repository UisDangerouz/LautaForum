
const express = require('express')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;
const dbAddress = ''

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.listen(port, () => {
  	console.log(`App listening at http://localhost:${port}`)
});

const postModel = mongoose.model("Post", mongoose.Schema({
    postId: Number,
    postDate: Date,
    responseId: Number,
    postTitle: String,
    postContent: String,
    postReplies: Number,
    postImage: String
}));

let nextPostId;
let adminPassword;

app.get('/post/:id', (req, res) => {
	res.sendFile('public/post.html', {root: __dirname })
});

app.get('/postInfo/:id', (req, res) => {
    let postId = req.params.id

    if (isNaN(postId) || parseFloat(postId) >= nextPostId) {
        res.send('Viestiä ei löytynyt.')
        return;
    }

    postModel.findOne({postId: postId}, (err, thisPost) => {
        if (err || !thisPost) {
            res.send('Viestiä ei löytynyt.')
            return;
        } 

        if ('responseId' in thisPost && thisPost.responseId) {
            // Post is not main post; get main post then replies
            postModel.findOne({postId: thisPost.responseId}, (err, mainPost) => {
                if (err) {
                    res.send('Viestiä ei pystytty lataamaan.');
                    return;
                }
                postModel.find({responseId: mainPost.postId}, (err, postReplies) => {
                    if (err) {
                        res.send('Viestiä ei pystytty lataamaan.')
                        return;
                    }
                    let allPosts = [mainPost].concat(postReplies)
                    res.send(allPosts)
                });
            })
        } else {
            //Post is main post; get replies
            postModel.find({responseId: thisPost.postId}, (err, postReplies) => {
                if (err) {
                    res.send('Viestiä ei pystytty lataamaan.')
                } else {
                    let allPosts = [thisPost].concat(postReplies)
                    res.send(allPosts)
                }
            });
        }
    });
});

app.get('/latestPosts', (req, res) => {
    postModel.find({responseId: null}).sort({postDate: -1}).limit(10).exec((err, posts) => {
        if (err || !posts) {
            res.send('Viestejä ei löytynyt.')
        } else {
            res.send(posts)
        }
    });
});

app.get('/popularPosts', (req, res) => {
    postModel.find({responseId: null}).sort({postReplies: -1}).limit(10).exec((err, posts) => {
        if (err || !posts) {
            res.send('Viestejä ei löytynyt.')
        } else {
            res.send(posts)
        }
    });
});

app.post('/createPost', (req, res) => {
    let post = req.body;

    if (!('responseId' in post) || !post.responseId) {
        // New message
        if (!('postTitle' in post) || !('postContent' in post) || !post.postTitle || !post.postContent) {
            res.send('Otsikko ja viesti eivät voi olla tyhjiä.')
            return;
        } 

        const newPost = new postModel({
            postId: nextPostId,
            postDate: new Date(),
            responseId: null,
            postTitle: post.postTitle,
            postContent: post.postContent,
            postReplies: 0,
            postImage: post.postImage
        });
        savePost(newPost).then(err => res.send(err))
    } else {
        // Reply to message
        if (!('postContent' in post) || !post.postContent) {
            res.send('Viesti ei voi olla tyhjiä.')
            return;
        } 
        let replyPost = post

        postModel.findOne({postId: post.responseId}, (err, mainPost) => {
            if (err || !post) {
                res.send('Yritit vastata viestiin, jota ei ole olemassa.')
                return;
            } 

            const newPost = new postModel({
                postId: nextPostId,
                postDate: new Date(),
                responseId: mainPost.postId,
                postTitle: null,
                postContent: replyPost.postContent,
                postReplies: 0,
                postImage: replyPost.postImage
            })
            savePost(newPost).then(err => {
                res.send(err)
                if (err) return
                mainPost.postReplies += 1;
                mainPost.save()
            })
        })

        
    }
});

app.post('/mods', (req, res) => {
    let password = req.body.text;
    
    if ((password && password === adminPassword)) {
        res.send(true)
        console.log('Moderator approved.')
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

async function savePost(post) {
    post.save(err => {
        if(err) {
            return 'Viestiä ei voitu lähettää.';
        } else {
            nextPostId += 1;
            return false;
        }
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