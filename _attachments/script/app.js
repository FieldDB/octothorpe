// Scaffold:
// Apache 2.0 J Chris Anderson 2011
$(function() {   
    var path = unescape(document.location.pathname).split('/'),
        design = path[3],
        db = $.couch.db(path[1]);
    var doc = null;
    function drawItems() {
        clearInterval(intervalID);
        console.log("going home");
        $("#profile").show();
        db.view(design + "/recent-items", {
            descending : "true",
            limit : 50,
            update_seq : true,
            success : function(data) {
                console.log("displaying home");
                doc = null; // clear the active doc
                setupChanges(data.update_seq,"");
                var them = $.mustache($("#documents").html(), {
                    items : data.rows.map(function(r) {return r.value;})
                });
                $("#content").html(them);
                undoSidebar();
            }
        });
    };

    var timer;
    var intervalID;
    function viewOne(id) {
        clearInterval(intervalID);
        console.log("going to " + id);
        db.openDoc(id, {
            success : function(data) {
                intervalID = setInterval(ping, Math.random()*1000 + 5000, id);
                ping(id);
                $("#profile").hide();
                // don't redraw if we already have this revision
                // This keeps the changes pushed while editing from knocking us out
                // of the textarea, since the save updated our revision first.
                if (doc === null || doc._id !== id) {
                    console.log("displaying new doc " + id);
                    doc = data;
                    setupChanges(data.update_seq,id);
                    var them = $.mustache($("#view").html(), data);
                    $("#content").html(them);
                    // todo: try/catch
                    $("#content").bind("input",resetTimer);
                    $("#doc-title").keydown(titleFix);
                }
                else if (doc._rev !== data._rev) { // external change to current doc
                    console.log("transforming doc");
                    $("#doc-title").text(data.title); // todo: do merge etc. here too
                    var contents = document.getElementById("contents");
                    var s = window.getSelection();
                    var doSelection = contents.contains(s.anchorNode);
                    // Only run selection code if there is a selection, and it's in the contents
                    // Note: safari <6 contains is broken. we could use a workaround,
                    // but I'm just dropping support for now.
                    if (doSelection) {
                        var range = s.getRangeAt(0);
                        var collapsed = s.isCollapsed; // just cursor, or actual selection?
                        console.log("transforming cursor too");
                        var mark = document.createTextNode("\x00"); // some unlikely character
                        range.insertNode(mark);
                        if (!collapsed) {
                            console.log("transforming a selection");
                            var mark2 = document.createTextNode("\x01");
                            var range2 = document.createRange();
                            range2.setStart(range.endContainer, range.endOffset);
                            // we have to be hacky since there's only insertNode
                            range2.insertNode(mark2);
                        }
                    }

                    var original = doc.contents;
                    var theirs = data.contents;
                    var ours = flatten(contents);
                    var theirChange = changesets.text.constructChangeset(original, theirs);
                    var ourChange = changesets.text.constructChangeset(original, ours);
                    var transformed = theirChange.transformAgainst(ourChange);
                    var result = transformed.apply(ours);
                    if (doSelection) {
                        result = result.split("\x00").join("<span id=mark></span>");
                        if (!collapsed) {
                            result = result.split("\x01").join("<span id=mark2></span>");
                        }
                    }

                    contents.innerHTML = result;

                    if (doSelection) {
                        // replace the cursor
                        var range = document.createRange();
                        var m1 = document.getElementById("mark");
                        range.setStartBefore(m1);
                        m1.parentNode.removeChild(m1);
                        if (!collapsed) {
                            var m2 = document.getElementById("mark2");
                            range.setEndBefore(m2);
                            m2.parentNode.removeChild(m2);
                        }
                        else {
                            range.collapse(true);
                        }
                        s.removeAllRanges();
                        s.addRange(range);
                    }

                    // fully transformed; update our reference doc
                    doc = data;
                }
                else {
                    console.log("never mind, we have that version already");
                }
                doSidebar(data);
            }
        });
    } ;

    function ping (id) {
        $.ajax("_update/active/actives-" + id, { type: "PUT", success: function (resp) {
            $("#actives").text(resp);
            }
        });
    }

    function doSidebar (data) {
        if (!data) {
            return;
        }
        var create_date = new Date(data.created_at);
        data.created_locale = create_date.toLocaleString();
        var modified_date = new Date(data.modified_at);
        data.modified_locale = modified_date.toLocaleString();

        data.gravatar_url = data.profile.gravatar_url;

        // calls out to get name each time; wasteful.
        $.couch.session({success : function(resp) {
            var username = resp.userCtx.name;
            var them;
            var actives = $("#actives").text();
            if (username !== data.owner) {
                console.log("username: " + username + "; owner: " + data.owner);
                them = $.mustache($("#protect_guest").html(), data);
                $("#sidebar").html(them).show();
                if(username===null || data.protect){
                    document.getElementById("contents").contentEditable = false;
                    document.getElementById("doc-title").contentEditable = false;
                    document.getElementById("editable").textContent = "Protected, not editable";
                }
                else {
                    document.getElementById("contents").contentEditable = true;
                    document.getElementById("doc-title").contentEditable = true;
                    document.getElementById("editable").textContent = "Editable!";
                }
            }

            else {
                console.log("user is owner");
                document.getElementById("contents").contentEditable = true;
                document.getElementById("doc-title").contentEditable = true;
                them = $.mustache($("#protect_owner").html(), data);
                $("#sidebar").html(them).show();
                $("#protect").change(submit);
                
            }
            $("#actives").text(actives);
        }});
    }
    function undoSidebar()
    {
        $("#sidebar").hide();
    }
    function resetTimer() {
        window.clearTimeout(timer);
        timer = window.setTimeout(submit, 1000);
        $("#saved-icon").attr("src","image/edit-unsaved.png");
    };

    function titleFix(e) {
        if (e.which === 13) {
            e.preventDefault();
        }
        else if (e.which === 8) {
            if ($(this).html() === "" || $(this).html() === "<br>") {
                e.preventDefault();
            }
        }
    }

    function submit() {
        var title = $("#doc-title").html().replace(/&lt;br&gt;/g,"").replace(/<br>/g,"");
        doc.title = (title === "") ? doc.title : title;
        doc.contents = flatten(document.getElementById("contents"));
        var protect = document.getElementById("protect");
        if (protect) {
            doc.protect = protect.checked;
            console.log("protect status " + doc.protect);
        }
        doc.modified_at = new Date();
        db.saveDoc(doc);
        $("#saved-icon").attr("src","image/check-mark-saved.png");
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
            doSidebar(doc);
            $("#profile").couchProfile(r, {
                profileReady : function(profile) {
                    $("#create-doc").couchForm({
                        beforeSave : function(doc) {
                            doc.contents = "Click here to edit this document";
                            doc.created_at = new Date();
                            doc.modified_at = doc.created_at;
                            doc.profile = profile;
                            doc.owner = r.userCtx.name;
                            doc.protect = false;
                            return doc;
                        },
                        success : function(doc) {
                            db.saveDoc({_id: "actives-" + doc._id,
                            owner: r.userCtx.name,
                            protect: false
                            });
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
