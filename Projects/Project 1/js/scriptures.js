/*================================================================================
 * FILE: scriptures.js
 * AUTHOR: Andrew Kimball
 * DATE: Jan 30th, 2022
 *
 * DESCRIPTION: Front-End JavaScript - Project 1
 *
 */
/*jslint
    browser,long
*/
/*global
    console, map, google
*/
/*property
    Animation, DROP, Marker, abs, animation, books, classKey, content, exec,
    forEach, fullName, getAttribute, getElementById, gridName, hash, href, id,
    includes, init, innerHTML, label, lat, latitude, length, lng, longitude, map, maps,
    maxBookId, minBookId, name, numChapters, onHashChanged, onerror, onload,
    open, parentBookId, parse, position, push, querySelectorAll, response, send, setMap,
    slice, split, status, title, toLowerCase, tocName
*/


const Scriptures = (function () {
    "use strict";

    /*-------------------------------------------------------------------
     *                      CONSTANTS
     */
    const ALTITUDE_CONVERTER = 450;
    const BOTTOM_PADDING = "<br /><br />";
    const CLASS_BUTTON = "btn";
    const CLASS_BOOKS = "books";
    const CLASS_VOLUME = "volume";
    const CLASS_CHAPTER = "chapter";
    const DIV_BREADCRUMBS = "crumbs";
    const DIV_SCRIPTURES_NAVIGATOR = "scripnav";
    const DIV_SCRIPTURES = "scriptures";
    const INDEX_FLAG = 11;
    const INDEX_LATITUDE = 3;
    const INDEX_LONGITUDE = 4;
    const INDEX_PLACENAME = 2;
    const INDEX_ALTITUDE = 9;
    const LAT_LONG_PARSER = /\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),'(.*)'\)/;
    const REQUEST_GET = "GET";
    const REQUEST_STATUS_OK = 200;
    const REQUEST_STATUS_ERROR = 400;
    const TAG_HEADER5 = "h5";
    const TAG_LIST_ITEM = "li";
    const TAG_UNORDERED_LIST = "ul";
    const TEXT_TOP_LEVEL = "The Scriptures";
    const URL_BASE = "https://scriptures.byu.edu/";
    const URL_BOOKS = `${URL_BASE}mapscrip/model/books.php`;
    const URL_SCRIPTURES = `${URL_BASE}mapscrip/mapgetscrip.php`;
    const URL_VOLUMES = `${URL_BASE}mapscrip/model/volumes.php`;


    /*-------------------------------------------------------------------
     *                      PRIVATE VARIABLES
     */
    let books;
    let volumes;
    let gmMarkers = [];
    let requestedBookId;
    let requestedChapter;


    /*-------------------------------------------------------------------
     *                      PRIVATE METHOD DECLARATIONS
     */
    let addMarker;
    let ajax;
    let bookChapterValid;
    let booksGrid;
    let booksGridContent;
    let cacheBooks;
    let chaptersGrid;
    let chaptersGridContent;
    let clearMarkers;
    let encodedScripturesUrlParameters;
    let getScripturesCallback;
    let getScripturesFailure;
    let htmlAnchor;
    let htmlDiv;
    let htmlElement;
    let htmlLink;
    let htmlListItem;
    let htmlListItemLink;
    let injectBreadCrumbs;
    let init;
    let navigateBook;
    let navigateChapter;
    let navigateHome;
    let nextChapter;
    let onHashChanged;
    let previousChapter;
    let setUpBreadCrumbNav;
    let setUpMarkers;
    let showLocation;
    let showLocationMatchNameIndex;
    let titleForBookChapter;
    let volumeForId;
    let volumesGridContent;
    let zoomFitMarkers;


    /*-------------------------------------------------------------------
     *                      PRIVATE METHODS
     */
    addMarker = function (placename, latitude, longitude) {
        let geoPlace = {latitude, longitude, name: placename};

        const similar = function (num1, num2) {
            return Math.abs(num1 - num2) < 0.00000001;
        };
        const matchingElement = function (array, object) {
            let match = null;
            array.forEach(function (element) {
                if (similar(element.position.lat(), object.latitude) && similar(element.position.lng(), object.longitude)) {
                    if (match === null) {
                        match = element;
                    }
                }
            });
            return match;
        };

        const matchedElement = matchingElement(gmMarkers, geoPlace);
        if (!matchedElement) {
            let marker = new google.maps.Marker({
                animation: google.maps.Animation.DROP,
                label: placename,
                map,
                position: {lat: Number(latitude), lng: Number(longitude)},
                title: placename
            });
            gmMarkers.push(marker);
        } else {
            if (!matchedElement.title.toLowerCase().includes(geoPlace.name.toLowerCase())) { 
                matchedElement.title = matchedElement.title + ", " + geoPlace.name;
                matchedElement.label = matchedElement.label + ", " + geoPlace.name;
            }
        }
    };

    // ajax = function (url, successCallback, failureCallback, skipJsonParse) {
    //     let request = new XMLHttpRequest();

    //     request.open(REQUEST_GET, url, true);

    //     request.onload = function () {
    //         if (request.status >= REQUEST_STATUS_OK && request.status < REQUEST_STATUS_ERROR) {
    //             let data = (
    //                 skipJsonParse
    //                 ? request.response
    //                 : JSON.parse(request.response)
    //             );

    //             if (typeof successCallback === "function") {
    //                 successCallback(data);
    //             }
    //         } else {
    //             if (typeof failureCallback === "function") {
    //                 failureCallback(request);
    //             }
    //         }
    //     };

    //     request.onerror = failureCallback;
    //     request.send();
    // };

    ajax = function (url, successCallback, failureCallback, skipJsonParse) {
        fetch(url)
        .then(function (response) {
            if (response.ok) {
                if (skipJsonParse) {
                    return response.text();
                } else {
                    return response.json()
                }
            }
            throw new Error("Network response failed.");
        })
        .then(function (data) {
            console.log("new ajax is working, i guess");
            successCallback(data);
        })
        .catch(function (error) {
            failureCallback(error);
        });
    };

    bookChapterValid = function (bookId, chapter) {
        let book = books[bookId];

        if (book === undefined || chapter < 0 || chapter > book.numChapters) {
            return false;
        }
        if (chapter === 0 && book.numChapters > 0) {
            return false;
        }
        return true;

    };

    booksGrid = function (volume) {
        return htmlDiv({
            classKey: CLASS_BOOKS,
            content: booksGridContent(volume)
        });
    };

    booksGridContent = function (volume) {
        let gridContent = "";

        volume.books.forEach(function (book) {
            gridContent += htmlLink({
                classKey: CLASS_BUTTON,
                content: book.gridName,
                href: `#${volume.id}:${book.id}`,
                id: book.id
            });
        });

        return gridContent;
    };

    cacheBooks = function (callback) {
        volumes.forEach(function (volume) {
            let volumeBooks = [];
            let bookId = volume.minBookId;

            while (bookId <= volume.maxBookId) {
                volumeBooks.push(books[bookId]);
                bookId += 1;
            }
            volume.books = volumeBooks;
        });

        if (typeof callback === "function") {
            callback();
        }
        //console logs work here
    };

    chaptersGrid = function (book) {
        return htmlDiv({
            classKey: CLASS_VOLUME,
            content: htmlElement(TAG_HEADER5, book.fullName)
        }) + htmlDiv({
            classKey: CLASS_BOOKS,
            content: chaptersGridContent(book)
        });
    };

    chaptersGridContent = function (book) {
        let gridContent = "";
        let chapter = 1;

        while (chapter <= book.numChapters) {
            gridContent += htmlLink({
                classKey: `${CLASS_BUTTON} ${CLASS_CHAPTER}`,
                content: chapter,
                href: `#0:${book.id}:${chapter}`,
                id: chapter
            });
            chapter += 1;
        }

        return gridContent;
    };

    clearMarkers = function () {
        gmMarkers.forEach(function (marker) {
            marker.setMap(null);
        });
        gmMarkers = [];
    };

    encodedScripturesUrlParameters = function (bookId, chapter, verses, isJst) {
        if (bookId !== undefined && chapter !== undefined) {
            let options = "";

            if (verses !== undefined) {
                options += verses;
            }

            if (isJst !== undefined) {
                options += "&jst=JST";
            }

            return `${URL_SCRIPTURES}?book=${bookId}&chap=${chapter}&verses=${options}`;
        }
    };

    getScripturesCallback = function (chapterHtml) {
        let book = books[requestedBookId];
        document.getElementById(DIV_SCRIPTURES).innerHTML = chapterHtml;

        let nextChapterInfo = nextChapter(book.id, requestedChapter);
        let prevChapterInfo = previousChapter(book.id, requestedChapter);

        setUpBreadCrumbNav(nextChapterInfo, prevChapterInfo);

        if (book !== undefined) {
            injectBreadCrumbs(volumeForId(book.parentBookId), book, requestedChapter);
        } else {
            injectBreadCrumbs();
        }

        setUpMarkers();
    };

    getScripturesFailure = function () {
        document.getElementById(DIV_SCRIPTURES).innerHTML = "Unable to retreive chatper contents.";
    };

    init = function (callback) {
        let booksLoaded = false;
        let volumesLoaded = false;

        ajax(URL_BOOKS, function (data) {
            books = data;
            booksLoaded = true;

            if (volumesLoaded) {
                cacheBooks(callback);
            }
        });
        ajax(URL_VOLUMES, function (data) {
            volumes = data;
            volumesLoaded = true;

            if (booksLoaded) {
                cacheBooks(callback);
            }
        });
    };

    injectBreadCrumbs = function (volume, book, chapter) {
        let crumbs = "";

        if (volume === undefined) {
            crumbs = htmlListItem(TEXT_TOP_LEVEL);
        } else {
            crumbs = htmlListItemLink(TEXT_TOP_LEVEL);

            if (book === undefined) {
                crumbs += htmlListItem(volume.fullName);
            } else {
                crumbs += htmlListItemLink(volume.fullName, volume.id);

                if (chapter === undefined || chapter <= 0) {
                    crumbs += htmlListItemLink(book.tocName);
                } else {
                    crumbs += htmlListItemLink(book.tocName, `${volumes.id}:${book.id}`);
                    crumbs += htmlListItem(chapter);
                }
            }
        }

        document.getElementById(DIV_BREADCRUMBS).innerHTML = htmlElement(TAG_UNORDERED_LIST, crumbs);
    };

    htmlAnchor = function (volume) {
        return `<a name="v${volume.id}" />`;
    };

    htmlDiv = function (parameters) {
        let classString = "";
        let contentString = "";
        let idString = "";

        if (parameters.classKey !== undefined) {
            classString = ` class="${parameters.classKey}"`;
        }
        if (parameters.content !== undefined) {
            contentString = parameters.content;
        }
        if (parameters.id !== undefined) {
            idString = ` id="${parameters.id}"`;
        }
        return `<div${idString}${classString}>${contentString}</div>`;
    };

    htmlElement = function (tagName, content) {
        return `<${tagName}>${content}</${tagName}>`;
    };

    htmlLink = function (parameters) {
        let classString = "";
        let contentString = "";
        let hrefString = "";
        let idString = "";

        if (parameters.classKey !== undefined) {
            classString = ` class="${parameters.classKey}"`;
        }
        if (parameters.content !== undefined) {
            contentString = parameters.content;
        }
        if (parameters.href !== undefined) {
            hrefString = ` href="${parameters.href}"`;
        }
        if (parameters.id !== undefined) {
            idString = ` id="${parameters.id}"`;
        }

        return `<a${idString}${classString}${hrefString}>${contentString}</a>`;
    };

    htmlListItem = function (content) {
        return htmlElement(TAG_LIST_ITEM, content);
    };

    htmlListItemLink = function (content, href = "") {
        return htmlListItem(htmlLink({content, href: `#${href}`}));
    };

    navigateBook = function (bookId) {
        let book = books[bookId];

        if (book.numChapters <= 1) {
            navigateChapter(bookId, book.numChapters);
        } else {
            document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
                content: chaptersGrid(book),
                id: DIV_SCRIPTURES_NAVIGATOR
            });
            injectBreadCrumbs(volumeForId(book.parentBookId), book);
        }
    };

    navigateHome = function (volumeId) {
        document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
            content: volumesGridContent(volumeId),
            id: DIV_SCRIPTURES_NAVIGATOR
        });
        injectBreadCrumbs(volumeForId(volumeId));
    };

    navigateChapter = function (bookId, chapter) {
        requestedBookId = bookId;
        requestedChapter = chapter;
        ajax(encodedScripturesUrlParameters(bookId, chapter), getScripturesCallback, getScripturesFailure, true);
    };

    nextChapter = function (bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {
            if (chapter < book.numChapters) {
                return [bookId, chapter + 1, titleForBookChapter(bookId, chapter + 1)];
            }

            let nextBook = books[bookId + 1];

            if (nextBook !== undefined) {
                let nextChapterValue = 0;
                if (nextBook.numChapters > 0) {
                    nextChapterValue = 1;
                }

                return [nextBook.id, nextChapterValue, titleForBookChapter(nextBook.id, nextChapterValue)];
            }
        }
    };

    onHashChanged = function () {
        let ids = [];

        if (location.hash !== "" && location.hash.length > 1) {
            ids = location.hash.slice(1).split(":");
        }
        if (ids.length <= 0) {
            navigateHome();
        } else if (ids.length === 1) {
            let volumeId = Number(ids[0]);

            if (volumeId < volumes[0].id || volumeId > volumes.slice(-1)[0].id) {
                navigateHome();
            } else {
                navigateHome(volumeId);
            }

        } else {
            let bookId = Number(ids[1]);
            if (books[bookId] === undefined) {
                navigateHome();
            } else {
                if (ids.length === 2) {
                    navigateBook(bookId);
                } else {
                    let chapter = Number(ids[2]);

                    if (bookChapterValid(bookId, chapter)) {
                        navigateChapter(bookId, chapter);
                    } else {
                        navigateHome();
                    }

                }
            }
        }
    };

    previousChapter = function (bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {
            if (chapter > 1) {
                return [bookId, chapter - 1, titleForBookChapter(bookId, chapter - 1)];
            }
            let prevBook = books[bookId - 1];

            if (prevBook !== undefined) {
                return [prevBook.id, prevBook.numChapters, titleForBookChapter(prevBook.id, prevBook.numChapters)];
            }
        }
    };

    setUpBreadCrumbNav = function (nextChapterInfo, prevChapterInfo) {

        if (nextChapterInfo !== undefined && prevChapterInfo !== undefined) {
            for (const navdiv of document.getElementsByClassName("navheading")) {
                navdiv.innerHTML += `<div class=\"nextprev\"><a href=\"#0:${prevChapterInfo[0]}:${prevChapterInfo[1]}\">Prev</a>` +
                                    `<a href=\"#0:${nextChapterInfo[0]}:${nextChapterInfo[1]}\">Next</a></div>`;
            }
        } else if (nextChapterInfo !== undefined && prevChapterInfo === undefined) {
            for (const navdiv of document.getElementsByClassName("navheading")) {
                navdiv.innerHTML += `<div class=\"nextprev\">` +
                                    `<a href=\"#0:${nextChapterInfo[0]}:${nextChapterInfo[1]}\">Next</a></div>`;
            }
        } else {
            for (const navdiv of document.getElementsByClassName("navheading")) {
                navdiv.innerHTML += `<div class=\"nextprev\"><a href=\"#0:${prevChapterInfo[0]}:${prevChapterInfo[1]}\">Prev</a></div>`;
            }
        }
    };

    setUpMarkers = function () {
        let singleMarkerAltitude = 0;
        if (gmMarkers.length > 0) {
            clearMarkers();
        }

        document.querySelectorAll("a[onclick^=\"showLocation(\"]").forEach(function (element) {
            let matches = LAT_LONG_PARSER.exec(element.getAttribute("onclick"));

            if (matches) {
                let placename = matches[INDEX_PLACENAME];
                let latitude = matches[INDEX_LATITUDE];
                let longitude = matches[INDEX_LONGITUDE];
                let flag = matches[INDEX_FLAG];
                singleMarkerAltitude = matches[INDEX_ALTITUDE];

                if (flag !== "") {
                    placename = `${placename} ${flag}`;
                }

                addMarker(placename, latitude, longitude);
            }
        });

        zoomFitMarkers(singleMarkerAltitude);
    };

    showLocation = function (geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
        let bounds = new google.maps.LatLngBounds();
        let indexMarker = showLocationMatchNameIndex(placename);
        if (Math.abs(gmMarkers[indexMarker].position.lat() - latitude) < 0.00000001 && Math.abs(gmMarkers[indexMarker].position.lng() - longitude) < 0.00000001) {
            bounds.extend(gmMarkers[indexMarker].getPosition());
            map.fitBounds(bounds);

            map.setZoom(Math.round(viewAltitude / ALTITUDE_CONVERTER));
        }
    };

    showLocationMatchNameIndex = function (placename) {
        let isMatch = (element) => element.title.includes(placename);
        return gmMarkers.findIndex(isMatch);
    };

    titleForBookChapter = function (bookId, chapter) {
        let book = books[bookId];
        if (book !== undefined) {
            if (chapter > 0) {
                return `${book.tocName} ${chapter}`;
            }
            return book.tocName;
        }
    };

    volumesGridContent = function (volumeId) {
        let gridContent = "";

        volumes.forEach(function (volume) {
            if (volumeId === undefined || volumeId === volume.id) {
                gridContent += htmlDiv({
                    classKey: CLASS_VOLUME,
                    content: htmlAnchor(volume) + htmlElement(TAG_HEADER5, volume.fullName)
                });

                gridContent += booksGrid(volume);
            }
        });

        return gridContent + BOTTOM_PADDING;
    };

    volumeForId = function (volumeId) {
        if (volumeId !== undefined && volumeId > 0 && volumeId <= volumes.length) {
            return volumes[volumeId - 1];
        }
    };

    zoomFitMarkers = function (viewAltitude) {
        let bounds = new google.maps.LatLngBounds();

        if (gmMarkers.length === 1) {
            bounds.extend(gmMarkers[0].getPosition());
            map.fitBounds(bounds);
            map.setZoom(Math.round(viewAltitude / ALTITUDE_CONVERTER));

        } else if (gmMarkers.length > 1) {

            for (let i = 0; i < gmMarkers.length; i++) {
                bounds.extend(gmMarkers[i].getPosition());
            }
            map.fitBounds(bounds);

            if (map.getZoom() > 13) {
                map.setZoom(11);
            }
        }
    }

    // public api
    return {
        init,
        onHashChanged,
        showLocation
    };
}());