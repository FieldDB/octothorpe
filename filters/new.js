function (doc,req) {
    var revSeq = doc._rev.split('-')[0];
    return revSeq === "1";
}
