function(newDoc, oldDoc, userCtx, secObj) {
    if (userCtx.name === null) {
        throw({unauthorized : "You must be logged in to perform that action"});
    }
    // creating new document
    if (!oldDoc && newDoc.owner !== userCtx.name) {
        throw({forbidden : "Owner field " + newDoc.owner + " must match username " + userCtx.name});
    }

    // thanks to couchdb guide
    var unchangeable = function (field) {
        if (oldDoc && toJSON(oldDoc[field]) != toJSON(newDoc[field]))
            throw({forbidden : "Field can't be changed: " + field});
    };

    var ownerOnly = function (field) {
        if (oldDoc && toJSON(oldDoc[field]) != toJSON(newDoc[field]) && userCtx.name !== oldDoc.owner)
            throw({forbidden : "Field can only be changed by owner: " + field});
    };

    unchangeable("owner");
    unchangeable("created_at");
    unchangeable("profile"); // maybe not necessary. what's it for, anyway?

    ownerOnly("protect");

    if (oldDoc && oldDoc.protect === true && userCtx.name !== oldDoc.owner) {
        throw({forbidden : "Owner has protected this document"});
    }

}
