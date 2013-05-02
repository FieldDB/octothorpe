function (doc, req) {
    var user = req.userCtx.name;
    doc.actives = doc.actives || {};
    doc.actives[user] = new Date();

    var filterOld = function (doc) {
        var expireTime = 10000;
        for (key in doc) {
            if (doc.hasOwnProperty(key)) {
                var last = new Date(doc[key]);
                if (Date.now() - last.getTime() > expireTime) {
                    delete doc[key];
                }
            }
        }
    }
    filterOld(doc.actives);

    return [doc, Object.keys(doc.actives).join(", ")];
}
