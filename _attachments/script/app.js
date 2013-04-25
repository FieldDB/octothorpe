// Scaffold:
// Apache 2.0 J Chris Anderson 2011
$(function() {   
    var path = unescape(document.location.pathname).split('/'),
        design = path[3],
        db = $.couch.db(path[1]);
    var doc = null;
    function drawItems() {
        db.view(design + "/recent-items", {
            descending : "true",
            limit : 50,
            update_seq : true,
            success : function(data) {
                doc = null; // clear the active doc
                setupChanges(data.update_seq,"");
                var them = $.mustache($("#documents").html(), {
                    items : data.rows.map(function(r) {return r.value;})
                });
                $("#content").html(them);
            }
        });
    };

    var timer;
    function viewOne(id) {
        db.openDoc(id, {
            success : function(data) {
                // don't redraw if we already have this revision
                // This keeps the changes pushed while editing from knocking us out
                // of the textarea, since the save updated our revision first.
                if (doc === null || doc._id !== id) {
                    doc = data;
                    setupChanges(data.update_seq,id);
                    var them = $.mustache($("#view").html(), data);
                    $("#content").html(them);
                    // todo: try/catch
                    $("#content").keydown(resetTimer);
                }
                else if (doc._rev !== data._rev) { // external change to current doc
                    var s = window.getSelection();
                    var doSelection = s.rangeCount > 0; // && selection is in "contents"
                    if (doSelection) {
                        var mark = document.createTextNode("\xff"); // some unlikely character
                        s.getRangeAt(0).insertNode(mark);
                    }

                    var original = doc.contents;
                    var theirs = data.contents;
                    var ours = flatten(document.getElementById("contents"));
                    var theirChange = changesets.text.constructChangeset(original, theirs);
                    var ourChange = changesets.text.constructChangeset(original, ours);
                    var transformed = theirChange.transformAgainst(ourChange);
                    var result = transformed.apply(ours);
                    if (doSelection) {
                        result = result.split("\xff").join("<span id=mark></span>");
                    }

                    document.getElementById("contents").innerHTML = result;

                    if (doSelection) {
                        // replace the cursor
                        var range = document.createRange();
                        range.selectNode(document.getElementById("mark"));
                        s.removeAllRanges();
                        s.addRange(range);
                    }

                    // fully transformed; update our reference doc
                    doc = data;
                }
            }
        });
    };

    function resetTimer() {
        window.clearTimeout(timer);
        timer = window.setTimeout(submit, 1000);
    };

    function submit() {
        doc.contents = flatten(document.getElementById("contents"));
        db.saveDoc(doc);
    };

    // after Tim Dowan, with changes: http://stackoverflow.com/questions/298750
    function flatten(node) {
        var text = "";
        var div = false;

        function sub(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.data;
            }
            else if (node.tagName === "BR" && !div) {
                text += "\n";
            }
            else {
                if (node.tagName === "DIV") {
                    div = true;
                    text += "\n";
                }

                for (var i = 0, len = node.childNodes.length; i < len; ++i) {
                    sub(node.childNodes[i]);
                }
            }
        }

        sub(node);
        return text;
    }

    function updateView() {
        if (document.location.hash === "") {
            drawItems();
        }
        else {
            viewOne(document.location.hash.slice(1));
            // slice to remove the #
        }
    };

    updateView();

    window.onhashchange = updateView;

    var changesFeed = false;
    var lastChangeHandler;
    function setupChanges(since,filterID) {
        if (changesFeed !== filterID) {
            var opts = {};
            if (filterID !== "") {
                opts.filter = design + "/doc_id";
                opts.id = filterID;
            }
            else {
                opts.filter = design + "/new";
            }
            changesFeed = filterID;
            var changeHandler = db.changes(since,opts);
            if (lastChangeHandler) {
                lastChangeHandler.stop();
            }
            changeHandler.onChange(updateView);
            lastChangeHandler = changeHandler;
        }
    };
    $.couchProfile.templates.profileReady = $("#new-doc").html();
    $("#account").couchLogin({
        loggedIn : function(r) {
            $("#profile").couchProfile(r, {
                profileReady : function(profile) {
                    $("#create-doc").couchForm({
                        beforeSave : function(doc) {
                            doc.contents = ["Click here to edit this document"];
                            doc.created_at = new Date();
                            doc.profile = profile;                         
                            return doc;
                        },
                        success : function(doc) {
                            document.location.hash = doc._id;
                        }
                    });
                }
            });
        },
        loggedOut : function() {
            $("#profile").html('<p>Please log in to see your profile.</p>');
        }
    });
 });
