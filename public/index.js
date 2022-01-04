function makePopularPostHTML(post) {
    return `${makePostLinkHTML(post.postId)}<b> ${post.postTitle}</b>  |  Vastauksia: ${post.postReplies}<br>`
}

function makeLatestPostHTML(post) {
    return `${makePostLinkHTML(post.postId)}<b> ${post.postTitle}</b><br>`
}

function getLatestPosts() {
    $('#latestPostsDiv').html('<h2>Viimeisimmät viestit:</h2>')
    $.get('/latestPosts', posts => {

        if (typeof posts === 'string') {
            $('#latestPostsDiv').append(posts)
        } else {
            posts.forEach(post => {
                $('#latestPostsDiv').append(makeLatestPostHTML(post))
            });
        }
    });
}

function getPopularPosts() {
    $('#topPostsDiv').html('<h2>Suosituimmat viestit:</h2>')
    $.get('/popularPosts', posts => {

        if (typeof posts === 'string') {
            $('#topPostsDiv').append(posts)
        } else {
            posts.forEach(post => {
                $('#topPostsDiv').append(makePopularPostHTML(post))
            });
        }
    });
}

$('#createPostButton').click(() => {
    let postImageData = null;
    if ($('#imagePreview').is(':visible')) {
        postImageData = canvas.toDataURL('image/jpeg').split(';base64,')[1]
    }

    let post = {
        responseId: null,
        postTitle: $('#postTitleInput').val(),
        postContent: $('#postTextInput').val(),
        postImage: postImageData
    }

    $.post('/createPost', post, (err) => {
        if (err) {
            alert(err)
        } else {
            $('#postTitleInput').val('')
            $('#postTextInput').val('')
            hideImagePreview();
            getLatestPosts();
        }
        
    });
});

$('#imageInput').change(showImagePreview)
$('#removeImageButton').click(hideImagePreview)

getLatestPosts();
getPopularPosts()
/*
const postModel = mongoose.model("Post", mongoose.Schema({
    postId: Number,
    postDate: Date,
    responseId: Number,
    postContent: String,*/