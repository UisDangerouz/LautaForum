function makeDetailedPostHtml(post) {
    let highLightedPost = ''
    if (post.postId == urlId) {
        highLightedPost = 'post-highlight'
    }

    let modsCookie = getCookie('mods')
    let showDeleteButton = (modsCookie && modsCookie.length > 0 && !postAlreadyDeleted(post));

    if (post.responseId) {
        
        return `<div id="${post.postId}" class="postDiv beige-bg ${highLightedPost}">
                    ${makePostLinkHTML(post.postId)}
                    <span class="date-color">${formatDate(post.postDate)}</span>
                    ${makeDeleteButtonHTML(showDeleteButton, post.postId)}
                    <br>
                    <b> Vastaus viestiin: </b>
                    ${makePostLinkHTML(post.responseId)}
                    ${makeImgHTML(post.postImage)}
                    <br><div>${renderPostText(post.postContent)}</div>
                </div>`
    } else {
        return `<div id="${post.postId}" class="postDiv beige-bg ${highLightedPost}">
                    ${makePostLinkHTML(post.postId)}
                    <span class="date-color">${formatDate(post.postDate)}</span>
                    ${makeDeleteButtonHTML(showDeleteButton, post.postId)}
                    <br>
                    <b> ${post.postTitle}</b>
                    ${makeImgHTML(post.postImage)}
                    <br><div>${renderPostText(post.postContent)}</div>
                </div>`
    }
}

let fullUrl = window.location.href
let path = fullUrl.split('/')
let urlId = path[path.length - 1].split('#')[0]
let mainPostId = path[path.length - 1]

function getPostInfo() {
    $('#postsContainerDiv').html('')
    $.get('/postInfo/' + mainPostId, posts => {
        if (posts.err) {
            alert(posts.err)
        } else {
            mainPostId = posts.data[0].postId 
            $('#replyToMessageText').html('#' + mainPostId)
            $('#replyToMessageText').attr('href', window.location.href)
            
            posts.data.forEach(post => {
                $('#postsContainerDiv').append(makeDetailedPostHtml(post))
            });

            location.href = '#';
            location.href = '#' + urlId.toString();
        }
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
    $.post('/createReply', post, payload => {
        if (payload.err) {
            alert(payload.err)
        } else {
            goToPost(payload.data)
        }
        
    }); 
});

function deletePost(postId) {
    $.post('/deletePost', {text: getCookie('mods'), id: postId}, success => {
        if (success) {
            $('#deleteButton' + postId.toString()).remove()
        } else {
            setCookie('mods', '', 1);
            getPostInfo();
        }
    });
}

$('#imageInput').change(showImagePreview)
$('#removeImageButton').click(hideImagePreview)

getPostInfo();



