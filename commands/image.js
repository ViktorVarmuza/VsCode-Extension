
function isImageUrl(url) {
    return /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
}

module.exports =  {isImageUrl};