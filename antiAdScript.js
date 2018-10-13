// ==UserScript==
// @name        webnovel.com skip video ads
// @namespace   http://forum.novelupdates.com/
// @version     4
// @run-at      document-end
// @match       http://webnovel.com/book/*
// @match       https://webnovel.com/book/*
// @match       http://www.webnovel.com/book/*
// @match       https://www.webnovel.com/book/*
// ==/UserScript==

//------------------------------------------------------------------------------
// This script is released to the public domain. No attribution is required.
//------------------------------------------------------------------------------

// How frequently this script should check for new chapters.
//
// The amount is in milliseconds.
const INTERVAL_CHAPTER_CHECK = 1000;

// When a token is not ready yet, this is how much time we should wait
// before trying again.
//
// The amount is in milliseconds.
const INTERVAL_TOKEN_CHECK = 1000;

/**
 * Check for new chapters and try to remove the adwall from them.
 */
function main() {
    Array.from(
        // Locked chapters.
        document.querySelectorAll('.cha-content._lock')
    ).forEach((lock) => {
        if (lock.closest('[data-vtype="2"]') || lock.querySelector('[data-vtype="2"]')) {
            return;
        }
        // Remove this class so this chapter won't be processed the next time
        // `main` is called.
        lock.classList.remove('_lock');

        // Remove the video.
        const v = lock.closest('.chapter_content').querySelector('.lock-video');
        if (v) {
            v.remove();
        }

        // Element with the chapter content.
        const contentElement = lock.querySelector('.cha-words');

        contentElement.style.opacity = '0.1';

        // Get the ID for the series ("book").
        //
        // Some chapters have the `data-bid` property, but not all of them.
        // That's why it's better to just get this from the URL.
        const bid = window.location.href.split('/book/')[1].split('/')[0];

        // Get the ID for the chapter.
        const {cid} = lock.querySelector('[data-cid]').dataset;

        // Both ID are required.
        if (!bid || !cid) {
            return;
        }

        return fetch(
            `https://www.webnovel.com/apiajax/chapter/GetChapterContentToken?bookId=${bid}&chapterId=${cid}`
        )
            .then(resp => resp.json())
            .then(data => data.data.token)
            .then(token => encodeURIComponent(token))
            .then(token => new Promise((resolve) => {
                // The raw body of the chapter.
                //
                // It will be plain text, so we must manually build the HTML for it.
                let content = '';

                // Try to get the content of the chapter, and fulfill the promise once
                // we have it.
                //
                // This function will retry until it succeeds.
                function tick() {
                    const url = `https://www.webnovel.com/apiajax/chapter/GetChapterContentByToken?token=${token}`;

                    fetch(url)
                        .then(resp => resp.json())
                        .then((data) => {
                            content = data.data.content.trim();

                            if (content) {
                                resolve(content);
                            } else {
                                setTimeout(tick, INTERVAL_TOKEN_CHECK);
                            }
                        })
                        .catch((err) => {
                            console.error(err.stack);

                            tick();
                        });
                }

                tick();
            }))
            .then((content) => {
                // Build the HTML for the chapter content.
                //
                // For now we only split on line breaks and wrap each piece
                // with "<p></p>" tags.
                const chapterHtml = content
                    .split('\n')
                    .map(p => p.trim())
                    .filter(p => !!p)
                    .map(p => `<p>${p}</p>`)
                    .join('');

                // Update the chapter content and turn opacity back to 100%.
                contentElement.innerHTML = chapterHtml;
                contentElement.style.opacity = '1';
            })
            .catch((err) => {
                console.error(err.stack);
            });
    });
}

// Since Qidian may load new chapters without refreshing the page, we must
// continuously check for new chapters in the page.
setInterval(main, INTERVAL_CHAPTER_CHECK);


//fixme another version
// ==UserScript==
// @name        webnovel.com skip video ads
// @namespace   http://forum.novelupdates.com/
// @version     5
// @run-at      document-end
// @match       http://webnovel.com/book/*
// @match       https://webnovel.com/book/*
// @match       http://www.webnovel.com/book/*
// @match       https://www.webnovel.com/book/*
// ==/UserScript==

//------------------------------------------------------------------------------
// This script is released to the public domain. No attribution is required.
//------------------------------------------------------------------------------

// FIX - 5/6/18
// I'm not sure why we need to explicitly pass _csrfToken here (since we specified credentials: include) but hey it works!
//

// How frequently this script should check for new chapters.
//
// The amount is in milliseconds.
const INTERVAL_CHAPTER_CHECK = 1000;

// When a token is not ready yet, this is how much time we should wait
// before trying again.
//
// The amount is in milliseconds.
const INTERVAL_TOKEN_CHECK = 1000;

function getCookie(name) {
    let value = "; " + document.cookie;
    let parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}

/**
 * Check for new chapters and try to remove the adwall from them.
 */
function main() {
    Array.from(
        // Locked chapters.
        document.querySelectorAll('.cha-content._lock')
    ).forEach((lock) => {
        // Remove this class so this chapter won't be processed the next time
        // `main` is called.
        lock.classList.remove('_lock');

        // Remove the video.
        const v = lock.closest('.chapter_content').querySelector('.lock-video');
        if (v) {
            v.remove();
        }

        // Element with the chapter content.
        const contentElement = lock.querySelector('.cha-words');

        contentElement.style.opacity = '0.1';

        // Get the ID for the series ("book").
        //
        // Some chapters have the `data-bid` property, but not all of them.
        // That's why it's better to just get this from the URL.
        const bid = window.location.href.split('/book/')[1].split('/')[0];

        // Get the ID for the chapter.
        const {cid} = lock.querySelector('[data-cid]').dataset;

        // Both ID are required.
        if (!bid || !cid) {
            return;
        }
        return fetch(
            `https://www.webnovel.com/apiajax/chapter/GetChapterContentToken?bookId=${bid}&chapterId=${cid}&_csrfToken=${getCookie("_csrfToken")}`
            , {credentials: "include"})
            .then(resp => resp.json())
            .then(data => {
                console.log(data);
                return data.data.token
            })
            .then(token => encodeURIComponent(token))
            .then(token => new Promise((resolve) => {
                // The raw body of the chapter.
                //
                // It will be plain text, so we must manually build the HTML for it.
                let content = '';

                // Try to get the content of the chapter, and fulfill the promise once
                // we have it.
                //
                // This function will retry until it succeeds.
                function tick() {
                    const url = `https://www.webnovel.com/apiajax/chapter/GetChapterContentByToken?token=${token}&_csrfToken=${getCookie("_csrfToken")}`;

                    fetch(url, {credentials: "include"})
                        .then(resp => resp.json())
                        .then((data) => {
                            content = data.data.content.trim();

                            if (content) {
                                resolve(content);
                            } else {
                                setTimeout(tick, INTERVAL_TOKEN_CHECK);
                            }
                        })
                        .catch((err) => {
                            console.error(err.stack);

                            tick();
                        });
                }

                tick();
            }))
            .then((content) => {
                // Build the HTML for the chapter content.
                //
                // For now we only split on line breaks and wrap each piece
                // with "<p></p>" tags.
                const chapterHtml = content
                    .split('\n')
                    .map(p => p.trim())
                    .filter(p => !!p)
                    .map(p => `<p>${p}</p>`)
                    .join('');

                // Update the chapter content and turn opacity back to 100%.
                contentElement.innerHTML = chapterHtml;
                contentElement.style.opacity = '1';
            })
            .catch((err) => {
                console.error(err);
            });
    });
}

// Since Qidian may load new chapters without refreshing the page, we must
// continuously check for new chapters in the page.
setInterval(main, INTERVAL_CHAPTER_CHECK);


//fixme another version
// ==UserScript==
// @name        webnovel.com skip video ads
// @namespace   http://forum.novelupdates.com/
// @version     5
// @run-at      document-end
// @match       http://webnovel.com/book/*
// @match       https://webnovel.com/book/*
// @match       http://www.webnovel.com/book/*
// @match       https://www.webnovel.com/book/*
// ==/UserScript==

//------------------------------------------------------------------------------
// This script is released to the public domain. No attribution is required.
//------------------------------------------------------------------------------

// How frequently this script should check for new chapters.
//
// The amount is in milliseconds.
const INTERVAL_CHAPTER_CHECK = 1000;

// When a token is not ready yet, this is how much time we should wait
// before trying again.
//
// The amount is in milliseconds.
const INTERVAL_TOKEN_CHECK = 1000;

function getCookie(name) {
    let value = "; " + document.cookie;
    let parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}

/**
 * Check for new chapters and try to remove the adwall from them.
 */
function main() {
    Array.from(
        // Locked chapters.
        document.querySelectorAll('.cha-content._lock')
    ).forEach((lock) => {
        // Check whether the chapter is inside or outside the `<div data-vtype="2">` element.
        if (lock.closest('[data-vtype="2"]') || lock.querySelector('[data-vtype="2"]')) {
            return;
        }

        // Remove this class so this chapter won't be processed the next time
        // `main` is called.
        lock.classList.remove('_lock');

        // Remove the video.
        const v = lock.closest('.chapter_content').querySelector('.lock-video');
        if (v) {
            v.remove();
        }

        // Element with the chapter content.
        const contentElement = lock.querySelector('.cha-words');

        contentElement.style.opacity = '0.1';

        // Get the ID for the series ("book").
        //
        // Some chapters have the `data-bid` property, but not all of them.
        // That's why it's better to just get this from the URL.
        const bid = window.location.href.split('/book/')[1].split('/')[0];

        // Get the ID for the chapter.
        const {cid} = lock.querySelector('[data-cid]').dataset;

        // Both ID are required.
        if (!bid || !cid) {
            return;
        }

        return fetch(
            `https://www.webnovel.com/apiajax/chapter/GetChapterContentToken?bookId=${bid}&chapterId=${cid}&_csrfToken=${getCookie("_csrfToken")}`
            , {credentials: "include"})
            .then(resp => resp.json())
            .then(data => {
                return data.data.token
            })
            .then(token => encodeURIComponent(token))
            .then(token => new Promise((resolve) => {
                // The raw body of the chapter.
                //
                // It will be plain text, so we must manually build the HTML for it.
                let content = '';

                // Try to get the content of the chapter, and fulfill the promise once
                // we have it.
                //
                // This function will retry until it succeeds.
                function tick() {
                    if (token != '') {
                        const url = `https://www.webnovel.com/apiajax/chapter/GetChapterContentByToken?token=${token}&_csrfToken=${getCookie("_csrfToken")}`;
                        fetch(url, {credentials: "include"})
                            .then(resp => resp.json())
                            .then((data) => {
                                content = data.data.content.trim();

                                if (content) {
                                    resolve(content);
                                } else {
                                    setTimeout(tick, INTERVAL_TOKEN_CHECK);
                                }
                            })
                            .catch((err) => {
                                console.error(err.stack);
                                tick();
                            });
                    }
                }

                tick();
            }))
            .then((content) => {
                // Build the HTML for the chapter content.
                //
                // For now we only split on line breaks and wrap each piece
                // with "<p></p>" tags.
                const chapterHtml = content
                    .split('\n')
                    .map(p => p.trim())
                    .filter(p => !!p)
                    .map(p => `<p>${p}</p>`)
                    .join('');

                // Update the chapter content and turn opacity back to 100%.
                contentElement.innerHTML = chapterHtml;
                contentElement.style.opacity = '1';
            })
            .catch((err) => {
                console.error(err);
            })
    });
}

// Since Qidian may load new chapters without refreshing the page, we must
// continuously check for new chapters in the page.
setInterval(main, INTERVAL_CHAPTER_CHECK);


//fixme another version
// ==UserScript==
// @name        webnovel.com skip video ads mobile
// @namespace   http://forum.novelupdates.com/
// @version     5
// @run-at      document-end
// @match       http://m.webnovel.com/book/*
// @match       https://m.webnovel.com/book/*
// @license     MIT
// ==/UserScript==


//-------------------------------------------------------------------------------------------------------------------
// Thanks go to shadofx for modifying the desktop version (v4) of this script
// to  work on mobile. This can be found at
// https://openuserjs.org/scripts/shadofx/webnovel.com_skip_video_ads_mobile/source
//-------------------------------------------------------------------------------------------------------------------

// How frequently this script should check for new chapters.
//
// The amount is in milliseconds.
const INTERVAL_CHAPTER_CHECK = 1000;

// When a token is not ready yet, this is how much time we should wait
// before trying again.
//
// The amount is in milliseconds.
const INTERVAL_TOKEN_CHECK = 1000;

function getCookie(name) {
    let value = "; " + document.cookie;
    let parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}

/**
 * Check for new chapters and try to remove the adwall from them.
 */
function main() {
    Array.from(
        // Locked chapters.
        document.querySelectorAll('.j_chapterWrapper')
    ).filter((item) => item.querySelector('.cha-txt').classList.contains('cha-txt-hide'))
        .forEach((lock) => {
            // Element with the chapter content.
            const contentElement = lock.querySelector('.cha-txt');

            // Remove this class so this chapter won't be processed the next time
            // `main` is called.
            contentElement.classList.remove('cha-txt-hide');

            // Remove the video.
            const v = lock.querySelector('.cha-watch-ad');
            if (v) v.remove();

            contentElement.style.opacity = '0.1';

            // Get the ID for the series ("book").
            //
            // Some chapters have the `data-bid` property, but not all of themw.
            // That's why it's better to just get this from the URL.
            const bid = window.location.href.split('/book/')[1].split('/')[0];

            // Get the ID for the chapter.
            const cid = lock.dataset.chapterid;

            //Get the csrf token
            const csrf = getCookie("_csrfToken");

//      alert(`https://m.webnovel.com/ajax/chapter/getChapterContentToken?bookId=${bid}&chapterId=${cid}&_csrfToken=${csrf}`);

            // Both ID are required.
            if (!bid || !cid || !csrf) {
                return;
            }

            return fetch(
                `https://m.webnovel.com/ajax/chapter/getChapterContentToken?bookId=${bid}&chapterId=${cid}&_csrfToken=${csrf}`
                , {credentials: "same-origin"})
                .then(resp => resp.json())
                .then(data => {
                    return data.data.token
                })
                .then(token => encodeURIComponent(token))
                .then(token => new Promise((resolve) => {
                    // The raw body of the chapter.
                    //
                    // It will be plain text, so we must manually build the HTML for it.
                    let content = '';

                    // Try to get the content of the chapter, and fulfill the promise once
                    // we have it.
                    //
                    // This function will retry until it succeeds.
                    function tick() {
                        if (token != '') {
                            const url = `https://m.webnovel.com/ajax/chapter/getChapterContentByToken?token=${token}&_csrfToken=${csrf}`;
                            fetch(url, {credentials: "same-origin"})
                                .then(resp => resp.json())
                                .then((data) => {
                                    content = data.data.content.trim();

                                    if (content) {
                                        resolve(content);
                                    } else {
                                        setTimeout(tick, INTERVAL_TOKEN_CHECK);
                                    }
                                })
                                .catch((err) => {
                                    console.error(err.stack);
                                    tick();
                                });
                        }
                    }

                    tick();
                }))
                .then((content) => {
                    // Build the HTML for the chapter content.
                    //
                    // For now we only split on line breaks and wrap each piece
                    // with "<p></p>" tags.
                    const chapterHtml = content
                        .split('\n')
                        .map(p => p.trim())
                        .filter(p => !!p)
                        .map(p => `<p>${p}</p>`)
                        .join('');

                    // Update the chapter content and turn opacity back to 100%.
                    contentElement.innerHTML = chapterHtml;
                    contentElement.style.opacity = '1';
                })
                .catch((err) => {
                    console.error(err.stack);
                });
        });
}

// Since Qidian may load new chapters without refreshing the page, we must
// continuously check for new chapters in the page.
setInterval(main, INTERVAL_CHAPTER_CHECK);

//fixme another version (https://openuserjs.org/scripts/shadofx/webnovel.com_skip_video_ads_mobile/source)
// ==UserScript==
// @name        webnovel.com skip video ads mobile
// @namespace   http://forum.novelupdates.com/
// @version     4
// @run-at      document-end
// @match       http://m.webnovel.com/book/*
// @match       https://m.webnovel.com/book/*
// @license     MIT
// ==/UserScript==

//------------------------------------------------------------------------------
// This script is released to the public domain. No attribution is required.
//------------------------------------------------------------------------------

// How frequently this script should check for new chapters.
//
// The amount is in milliseconds.
const INTERVAL_CHAPTER_CHECK = 1000;

// When a token is not ready yet, this is how much time we should wait
// before trying again.
//
// The amount is in milliseconds.
const INTERVAL_TOKEN_CHECK = 1000;

/**
 * Check for new chapters and try to remove the adwall from them.
 */
function main() {
    Array.from(
        // Locked chapters.
        document.querySelectorAll('.j_chapterWrapper')
    ).filter((item) => item.querySelector('.cha-txt').classList.contains('cha-txt-hide'))
        .forEach((lock) => {
            // Element with the chapter content.
            const contentElement = lock.querySelector('.cha-txt');

            // Remove this class so this chapter won't be processed the next time
            // `main` is called.
            contentElement.classList.remove('cha-txt-hide');

            // Remove the video.
            const v = lock.querySelector('.cha-watch-ad');
            if (v) v.remove();

            contentElement.style.opacity = '0.1';

            // Get the ID for the series ("book").
            //
            // Some chapters have the `data-bid` property, but not all of them.
            // That's why it's better to just get this from the URL.
            const bid = window.location.href.split('/book/')[1].split('/')[0];

            // Get the ID for the chapter.
            const cid = lock.dataset.chapterid;

            // Both ID are required.
            if (!bid || !cid) {
                return;
            }

            return fetch(
                `https://m.webnovel.com/ajax/chapter/GetChapterContentToken?bookId=${bid}&chapterId=${cid}`
            )
                .then(resp => resp.json())
                .then(data => data.data.token)
                .then(token => encodeURIComponent(token))
                .then(token => new Promise((resolve) => {
                    // The raw body of the chapter.
                    //
                    // It will be plain text, so we must manually build the HTML for it.
                    let content = '';

                    // Try to get the content of the chapter, and fulfill the promise once
                    // we have it.
                    //
                    // This function will retry until it succeeds.
                    function tick() {
                        const url = `https://m.webnovel.com/ajax/chapter/GetChapterContentByToken?token=${token}`;

                        fetch(url)
                            .then(resp => resp.json())
                            .then((data) => {
                                content = data.data.content.trim();

                                if (content) {
                                    resolve(content);
                                } else {
                                    setTimeout(tick, INTERVAL_TOKEN_CHECK);
                                }
                            })
                            .catch((err) => {
                                console.error(err.stack);

                                tick();
                            });
                    }

                    tick();
                }))
                .then((content) => {
                    // Build the HTML for the chapter content.
                    //
                    // For now we only split on line breaks and wrap each piece
                    // with "<p></p>" tags.
                    const chapterHtml = content
                        .split('\n')
                        .map(p => p.trim())
                        .filter(p => !!p)
                        .map(p => `<p>${p}</p>`)
                        .join('');

                    // Update the chapter content and turn opacity back to 100%.
                    contentElement.innerHTML = chapterHtml;
                    contentElement.style.opacity = '1';
                })
                .catch((err) => {
                    console.error(err.stack);
                });
        });
}

// Since Qidian may load new chapters without refreshing the page, we must
// continuously check for new chapters in the page.
setInterval(main, INTERVAL_CHAPTER_CHECK);
