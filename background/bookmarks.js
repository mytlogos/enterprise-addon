let bookmarkRequestActive = false;

/**
 * @param {browser.bookmarks.BookmarkTreeNode} bookmarkTreeNode
 * @param {browser.bookmarks.BookmarkTreeNode[]} toAddBookMarks
 * @param bookMarkInfo
 * @param {number} level
 */
async function checkBookmark(bookmarkTreeNode, toAddBookMarks = [], bookMarkInfo, level = 0) {
    if (!UserSystem.userName) {
        return;
    }
    if (!bookMarkInfo) {
        bookMarkInfo = await StoreManager.read(bookMarkStoreKey);

        if (!bookMarkInfo) {
            bookMarkInfo = {unused: []};
        }
    }

    // check if folder
    if (!bookmarkTreeNode.url) {
        if (bookmarkTreeNode.title === folderKeyName) {
            for (const child of bookmarkTreeNode.children) {
                // we ignore folders in keyFolders with name in variable 'folderKeyName'
                if (!child.url) {
                    continue;
                }

                if (!bookMarkInfo.lastRead || bookMarkInfo.lastRead <= child.dateAdded) {
                    toAddBookMarks.push(child);
                }
            }
        } else {
            for (const child of bookmarkTreeNode.children) {
                await checkBookmark(child, toAddBookMarks, bookMarkInfo, level + 1)
            }
        }
    } else if (bookmarkTreeNode.parentId && bookmarkTreeNode.url) {
        const bookmarkTreeNodes = await browser.bookmarks.get(bookmarkTreeNode.parentId);

        if (bookmarkTreeNodes.length === 1 && bookmarkTreeNodes[0].title === folderKeyName) {
            toAddBookMarks.push(bookmarkTreeNode);
        }
    }

    if (!level && UserSystem.userName) {
        if (bookMarkInfo.unused == null) {
            bookMarkInfo.unused = [];
        }
        const urls = [...new Set([...toAddBookMarks.map(value => value.url), ...bookMarkInfo.unused])];
        try {
            if (urls.length) {
                if (bookmarkRequestActive) {
                    return;
                }
                bookmarkRequestActive = true;
                const unused = await UserSystem.sendBookMarks(urls);
                bookMarkInfo.unused = [...new Set([...bookMarkInfo.unused, ...unused])];
            }

            bookMarkInfo.lastRead = Date.now();
            await StoreManager.write(bookMarkStoreKey, bookMarkInfo);
        } catch (e) {
            console.error(e);
        }
        bookmarkRequestActive = false;
    }
}

const bookMarkStoreKey = "lastBookmarkRead";
const folderKeyName = "Enterprise Media";

browser.bookmarks.onCreated.addListener((id, bookmark) => checkBookmark(bookmark).catch(console.error));
browser.bookmarks.onMoved.addListener(async (id, moveInfo) => {
    let parentNodes = await browser.bookmarks.get(moveInfo.parentId);

    const bookmarkNodes = await browser.bookmarks.get(id);

    if (parentNodes.some(parentNode => parentNode.title === folderKeyName)) {
        for (let bookmarkNode of bookmarkNodes) {
            try {
                await checkBookmark(bookmarkNode);
            } catch (e) {
                console.error(e);
            }
        }
    }
});

function checkBookmarkTree() {
    browser.bookmarks.getTree().then(value => {
        if (value.length) {
            value.forEach(bookmark => checkBookmark(bookmark).catch(console.error));
        }
    });
}

checkBookmarkTree();
