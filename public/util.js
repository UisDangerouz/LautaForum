let canvas = document.getElementById('imagePreview')
let ctx = canvas.getContext("2d")

function makeDeleteButtonHTML(showDeleteButton, postId) {
    if (!showDeleteButton) return ''

    return `<button id="deleteButton${postId}" onclick="deletePost(${postId});" class="deleteButton button">Poista</button>`
}

function makePostLinkHTML(postId) {
    let url = window.location.origin + '/post/' + postId.toString()
    return `<a href=\"${url}\">#${postId}</a>`
}

function makeImgHTML(imageData) {
    if (!imageData) return ''

    return `<img style="display: block" src="data:image/jpeq;base64, ${imageData}">`
}

function renderLinks(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>')
}

function renderMessageHastags(text) {
    if (text.indexOf('#') === - 1) {
        return text;
    }

    let hashtagBegin = -1
    let i = 0;
    text += ' '
    while (i < text.length) {
        char = text.charAt(i)

        if (hashtagBegin !== -1 && !/\d/.test(char)) {
            let postId = text.substring(hashtagBegin + 1, i)
            if (/^\d+$/.test(postId)) {
                let linkHTML = makePostLinkHTML(postId)
                text = text.substring(0, hashtagBegin) + linkHTML + text.substring(i, text.length)
                i += linkHTML.length - (i - hashtagBegin)
                hashtagBegin = -1
            }
        }
        if (char === '#') {
            hashtagBegin = i
        }
        i += 1
    }
    return text
}

function renderPostText(text) {
    return renderMessageHastags(renderLinks(text))
}

function formatDate(dateToFormat) {
    let date = new Date(dateToFormat);

    function padNumber(num) {
        return ('00' + num).slice(-2);
    }

    let day = date.getDay() + 1
    let month = date.getMonth() + 1
    let year = (date.getFullYear())
    let hours = padNumber(date.getHours())
    let minutes = padNumber(date.getMinutes())

    return `${day}.${month}.${year} ${hours}:${minutes}`
}

function validImageExtension(path) {
    let pathParts = path.split('.')
    let imageExtension = pathParts[pathParts.length - 1];

    if (imageExtension !== 'png' && imageExtension !== 'jpeg' && imageExtension !== 'jpg') {
        alert('Ainoastaan .png, .jpeg ja .jpg kuvat ovat sallittuja.')
        return false;
    }
    return true
}

function showImagePreview() {
    if (!this.files || !this.files[0]) return;
    if (!validImageExtension(this.files[0].name)) return;

    const FR = new FileReader();
    FR.addEventListener("load", (evt) => {
        const img = new Image();
        img.addEventListener("load", () => {
            drawImageScaled(img, ctx)
            $('#imagePreview').show()
            $('#removeImageButton').css('display', 'block')
            $('#addImageButton').hide()
        });
        img.src = evt.target.result;
    });
    FR.readAsDataURL(this.files[0]);
}

function drawImageScaled(img, ctx) {
    let hRatio = 400 / img.width;
    let vRatio = 200 / img.height;
    let ratio = Math.min(hRatio, vRatio);

    canvas.width = img.width * ratio
    canvas.height = img.height * ratio

    ctx.clearRect(0, 0, 400, 200);
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width * ratio, img.height * ratio);
}

function hideImagePreview() {
    $('#imagePreview').hide()
    $('#removeImageButton').hide()
    $('#addImageButton').show()
    $('#imageInput').val('')
}

function postAlreadyDeleted(post) {
    return (post.postTitle === 'Viesti poistettu' && post.postContent === '' && post.postImage === null) || 
        (post.postTitle === '' && post.postContent === 'Viesti poistettu' && post.postImage === null) 
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function goToPost(postId) {
    window.location.href = window.location.origin + '/post/' + postId.toString()
}

$('#sendModsButton').click(() => {
    let modsText = $('#moderatorTextInput').val()
    $.post('/mods', {text: modsText}, (result) => {
        if (result) {
            setCookie('mods', modsText, 1)
        } else {
            setCookie('mods', '', 1)
        }
        location.reload();
    })
});