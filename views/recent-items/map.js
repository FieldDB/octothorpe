function(doc) {
  if (doc.created_at) {
      var p = doc.profile || {};
      emit(doc.created_at, {
          title:doc.title,
          id : doc._id, // this is sent elsewhere in the response too...
          gravatar_url : p.gravatar_url,
          nickname : p.nickname,
          name : doc.name
      });
  }
};
