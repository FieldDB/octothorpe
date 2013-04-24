function(doc) {
  if (doc.created_at) {
      var p = doc.profile || {};
      emit(doc.created_at, {
          title:doc.title,
          contents:doc.contents,
          gravatar_url : p.gravatar_url,
          nickname : p.nickname,
          name : doc.name
      });
  }
};
