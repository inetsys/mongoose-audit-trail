var audit = require("./index.js");
var mongoose = require("mongoose");


var Test = new mongoose.Schema({
  a: String,
  b: Number,
  c: [],
  d: {
    e: String
  }
});

require("mongoose-audit-trail")(Test, {
  mongoose: mongoose,
  modelName: 'Test',

  typeCallback: function(path, doc) {
    return 'int';
  },
  labelCallback: function(path, doc) {
    return 'label';
  }
});

var model = mongoose.model('Test', Test);

var m = new model({
  a: "wtf"
});

console.log(
  m.getAuditDiffs({
    c: []
  })
);

var pre = m.toJSON();

m.b = 101;

console.log(
  m.getAuditDiffs(pre)
);
