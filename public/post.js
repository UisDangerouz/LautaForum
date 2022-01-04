function makeDetailedPostHtml(post) {
    let highLightedPost = ''
    if (post.postId == urlId) {
        highLightedPost = 'post-highlight'
    }

    let modsCookie = getCookie('mods')
    let mods = (modsCookie && modsCookie.length > 0);

    if (post.responseId) {
        
        return `<div id="postDiv" class="beige-bg ${highLightedPost}">
                    ${makePostLinkHTML(post.postId)}
                    <span class="date-color">${formatDate(post.postDate)}</span>
                    ${makeDeleteButtonHTML(mods, post.postId)}
                    <br>
                    <b> Vastaus viestiin: </b>
                    ${makePostLinkHTML(post.responseId)}
                    ${makeImgHTML(post.postImage)}
                    <pre>${renderPostText(post.postContent)}</pre>
                </div>`
    } else {
        return `<div id="postDiv" class="beige-bg ${highLightedPost}">
                    ${makePostLinkHTML(post.postId)}
                    <span class="date-color">${formatDate(post.postDate)}</span>
                    ${makeDeleteButtonHTML(mods, post.postId)}
                    <br>
                    <b> ${post.postTitle}</b>
                    ${makeImgHTML(post.postImage)}
                    <pre>${renderPostText(post.postContent)}</pre>
                </div>`
    }
}

function makeErrorPostHtml(error) {
    return `<div id="postDiv" class="beige-bg">
                ${error}
            </div>`
}

let fullUrl = window.location.href
let path = fullUrl.split('/')
let urlId = path[path.length - 1]
let mainPostId = path[path.length - 1]

function getPostInfo() {
    $('#postsContainerDiv').html('')
    $.get('/postInfo/' + mainPostId, posts => {
        console.log(posts)
        if (typeof posts === 'string') {
            $('#postsContainerDiv').append(makeErrorPostHtml(posts))
            $('#createPostsDiv').hide()
        } else {
            mainPostId = posts[0].postId 
            $('#replyToMessageText').html('#' + mainPostId)
            $('#replyToMessageText').attr('href', window.location.href)
            
            posts.forEach(post => {
                $('#postsContainerDiv').append(makeDetailedPostHtml(post))
            });
        }
        $('#postsContainerDiv').show()
    });
}

$('#createPostButton').click(() => {
    let postImageData = null;
    if ($('#imagePreview').is(':visible')) {
        postImageData = canvas.toDataURL('image/jpeg').split(';base64,')[1]
    }

    let post = {
        responseId: mainPostId,
        postTitle: null,
        postContent: $('#postTextInput').val(),
        postImage: postImageData
    }
    $.post('/createPost', post, (err) => {
        if (err) {
            alert(err)
        } else {
            $('#postTextInput').val('')
            hideImagePreview();
            getPostInfo();
        }
        
    }); 
});

function deletePost(postId) {
    $.post('/deletePost', {text: getCookie('mods'), id: postId}, success => {
        if (!success) setCookie('mods', '', 1)
        getPostInfo();
    });
}

$('#imageInput').change(showImagePreview)
$('#removeImageButton').click(hideImagePreview)

getPostInfo();

/*
    postId: Number,
    postDate: Date,
    responseId: Number,
    postTitle: String,
    postContent: String,
*/

