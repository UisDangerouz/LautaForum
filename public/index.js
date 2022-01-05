function makePopularPostHTML(post) {
    return `${makePostLinkHTML(post.postId)}<b> ${post.postTitle}</b>  |  Vastauksia: ${post.postReplies}<br>`
}

function makeLatestPostHTML(post) {
    return `${makePostLinkHTML(post.postId)}<b> ${post.postTitle}</b><br>`
}

function getLatestPosts() {
    
    $.get('/latestPosts', payload => {

        if (payload.err) {
            alert(err)
        } else {
            payload.data.forEach(post => {
                $('#latestPostsDiv').append(makeLatestPostHTML(post))
            });
        }
    });
}

function getHomepagePosts() {
    $('#latestPostsDiv').html('<h2>Viimeisimmät viestit:</h2>')
    $('#topPostsDiv').html('<h2>Suosituimmat viestit:</h2>')

    $.get('/homepagePosts', posts => {
        
        if (posts.latest.err) {
            alert(posts.latest.err)
        } else {
            posts.latest.data.forEach(post => {
                $('#latestPostsDiv').append(makeLatestPostHTML(post))
            }); 
        }

        if (posts.popular.err) {
            alert(posts.popular.err);
        } else {
            posts.popular.data.forEach(post => {
                $('#topPostsDiv').append(makePopularPostHTML(post))
            }); 
        }

        if (posts.newMessagesCount.err) {
            alert(posts.newMessagesCount.err)
        } else {
            $('#recentMessagesCountText').html(posts.newMessagesCount.data.toString() + ' Viestiä viimeisen tunnin aikana!')
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

    $.post('/createPost', post, payload => {
        if (payload.err) {
            alert(payload.err)
        } else {
            goToPost(payload.data)
        }
    });
});

$('#imageInput').change(showImagePreview)
$('#removeImageButton').click(hideImagePreview)

getHomepagePosts();
