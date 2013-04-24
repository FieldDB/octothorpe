// Apache 2.0 J Chris Anderson 2011
$(function() {   
    var path = unescape(document.location.pathname).split('/'),
        design = path[3],
        db = $.couch.db(path[1]);
    function drawItems() {
        db.view(design + "/recent-items", {
            descending : "true",
            limit : 50,
            update_seq : true,
            success : function(data) {
                setupChanges(data.update_seq,"");
                var them = $.mustache($("#documents").html(), {
                    items : data.rows.map(function(r) {return r.value;})
                });
                $("#content").html(them);
            }
        });
    };

    function viewOne(id) {
        db.openDoc(id, {
            success : function(data) {
                setupChanges(data.update_seq,id);
                var them = $.mustache($("#view").html(), data);
                $("#content").html(them);
                // todo: try/catch
            }
        });
    };

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
            var changeHandler = db.changes(since,opts);
            changesFeed = filterID;
            changeHandler.onChange(updateView);
        }
    };
    $.couchProfile.templates.profileReady = $("#new-message").html();
    $("#account").couchLogin({
        loggedIn : function(r) {
            $("#profile").couchProfile(r, {
                profileReady : function(profile) {
                    $("#create-message").couchForm({
                        beforeSave : function(doc) {
                            doc.created_at = new Date();
                            doc.profile = profile;                         
                            return doc;
                        }
                    });
                    $("#create-message").find("input").focus();
                }
            });
        },
        loggedOut : function() {
            $("#profile").html('<p>Please log in to see your profile.</p>');
        }
    });
 });
