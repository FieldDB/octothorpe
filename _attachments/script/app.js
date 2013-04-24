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
                if (doc === null || doc._rev !== data._rev) {
                    doc = data;
                    setupChanges(data.update_seq,id);
                    var them = $.mustache($("#view").html(), data);
                    $("#content").html(them);
                    // todo: try/catch
                    $("#content").keypress(resetTimer);
                }
            }
        });
    };

    function resetTimer() {
        window.clearTimeout(timer);
        timer = window.setTimeout(submit, 1000);
    };

    function submit() {
        doc.contents = getLines(document.getElementById("contents"));
        db.saveDoc(doc);
    };

    // after Tim Dowan, with changes: http://stackoverflow.com/questions/298750
    function getLines(node) {
        var lines = [];

        var br = false;
        function sub(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                br = false;
                lines.push(node.data);
            }
            else if (node.tagName === "BR") {
                if (br) { lines.push("") }// look for consecutive BRs
                br = true;
            }
            else {
                br = true;
                for (var i = 0, len = node.childNodes.length; i < len; ++i) {
                    sub(node.childNodes[i]);
                }
            }
        }

        sub(node);
        return lines;
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
            var changeHandler = db.changes(since,opts);
            changesFeed = filterID;
            changeHandler.onChange(updateView);
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
