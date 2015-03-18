/**
* # Mongoose Audit Trail
*
* Record any field change made to a mongoose model,
* manually, do not use pre/post hooks.
*
* Tested with mongoose 3.8.x
*
* Instance Methods added to the original schema:
* * getAudit
* * getAuditVersion
* * getAuditBetween
* * getAuditDiffs
* * saveAuditDiffs
*
* options object:
* ```js
* {
*   mongoose: require("mongoose"), // moongoose instance
*   modelName: String,
*   // add a label based on the object path
*   // maybe your model change over time, this will keep a readable
*   // path for users in your schema
*   labelCallback: Function, // (path, doc) -> String
*   // variable type of the changed. Useful for Date vs String
*   typeCallback: Function, // (path, doc) -> String
*   // user model to ref in the audit schema
*   modelUser: String,
*   // how to obtain the user that edited
*   userCallback: Function // (path, doc) -> User
*   // remove unwanted audit lines
*   filterAuditCallback: Function, // (change, path, doc) -> Boolean
* }
* ```
*
* ## Usage / Example
*
* ```js
* audit(Schema, {
*   modelName: "model_name",
*   userName: "user_model_name",
*   collection: "collection_audit",
*   labelCallback: function(path, doc) {
*     return path.toUpperCase();
*   },
*   typeCallback: function(path, doc) {
*     return "string";
*   },
*   userCallback: function(path, doc) {
*     return doc.owner;
*   }
* });
* ```
*
*/
module.exports = function (schema, options) {
  'use strict';

  if (!options || !options.mongoose) {
    console.log('mongoose-versioner requires mongoose to be passed in as an options reference.');
    return;
  }

  var timestamps = require('mongoose-timestamp'),
    mongoose = options.mongoose,
    Schema = mongoose.Schema,
    modelName = options.modelName,
    modelUser = options.modelUser,

    auditName = modelName + '_audit',

    schema_obj = {
      src: {type: mongoose.Schema.Types.ObjectId, ref: modelName},
      src__v: Number, // copy src's version here
      action: String,
      path: String,
      lhs: String,
      rhs: String
    };

  if (options.labelCallback) {
    schema_obj.label = String;
  }

  if (options.typeCallback) {
    schema_obj.type = String;
  }

  if (options.userCallback && modelUser) {
    schema_obj.user = {type: mongoose.Schema.Types.ObjectId, ref: modelUser};
  }

  var schema_options = {};
  if (options.collection) {
    schema_options.collection = options.collection;
  }
  var auditSchema = new mongoose.Schema(schema_obj, schema_options);

  auditSchema.plugin(timestamps, {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  mongoose.model(auditName, auditSchema);

  function getModel(conn) {
    try {
      var mdl = conn.model(auditName);
      return mdl;
    } catch(e) {
      return conn.model(auditName, auditSchema);
    }
  }
  /**
   * Retrive all audit info
   *
   * @name getAudit
   * @param {Function} callback (err, result_arr)
   */
  function getAudit(callback) {
    var model = getModel(this.db);

    var query = model.find({
      src: this._id
    });

    if (options.userCallback) {
      query = query.populate("user");
    }

    return query
    .sort({created_at: -1})
    .exec(function (err, result) {
      callback(err, result);
    });
  }
  /**
  * Retrive all audit info for a given version
  *
  * @name getAuditVersion
  * @param {Number} v
  * @param {Function} callback (err, result_arr)
  */
  function getAuditVersion(v, callback) {
    var model = getModel(this.db);

    var query = model.find({
      src: this._id,
      src__v: v
    });

    if (options.userCallback) {
      query = query.populate("user");
    }

    return query
    .sort({created_at: -1})
    .exec(function (err, result) {
      callback(err, result);
    });
  }
  /**
  * Retrive all audit info for a given version range
  *
  * @name getAuditBetween
  * @param {Number} v1
  * @param {Number} v2
  * @param {Function} callback (err, result_arr)
  */
  function getAuditBetween(v1, v2, callback) {
    var a = Math.min(v1 , v2);
    var b = Math.max(v1 , v2);

    var model = getModel(this.db);

    var query = model.find({
      src: this._id,
      src__v: {"$gte": a, "$lt": b}
    });

    if (options.userCallback) {
      query = query.populate("user");
    }

    return query
    .sort({created_at: -1})
    .exec(function (err, result) {
      callback(err, result);
    });
  }
  /**
  * Return an array with all the differents found.
  * Later that array should be sent to saveAuditDiffs when the object
  * it succesfully saved.
  *
  * @name getAuditDiffs
  * @param {Object} obj object to compare
  * @return {Array}
  */
  function getAuditDiffs(obj) {
    return get_audit_diff(this.toJSON(), obj, this, options);
  }
  /**
  * Save audit differences into mongo
  *
  * @name saveAuditDiffs
  * @param {Array} diffs
  * @param {Function} callback (err, saved_data)
  */
  function saveAuditDiffs(diffs, callback) {
    var model = getModel(this.db);

    //filter[versionOfIdPath] = this._id;

    return model.create(diffs, function (err, result) {
      callback(err, result);
    });
  }

  schema.methods.getAudit = getAudit;
  schema.methods.getAuditVersion = getAuditVersion;
  schema.methods.getAuditBetween = getAuditBetween;
  schema.methods.getAuditDiffs = getAuditDiffs;
  schema.methods.saveAuditDiffs = saveAuditDiffs;
};


var diff = require('deep-diff').diff;

function get_audit_diff(before, after, doc, options, base_path) {
  var differences = [],
    base_path = base_path || [];

  diff(before, after)
  .filter(function (d) {
    // ignore some fields
    if (d.path.length === 1 && ['_id', '__v', 'updated_at', 'created_at'].indexOf(d.path[d.path.length - 1]) > -1) {
      return false;
    }

    // path array is shared (reference) always manipulate the clone
    var path = base_path.concat(d.path);

    switch (d.kind) {
    case 'E':
      // fix date issues
      if (d.lhs instanceof Date) {
        return d.lhs.getTime() !== (new Date(d.rhs)).getTime();
      }
      if (d.rhs instanceof Date) {
        return d.rhs.getTime() !== (new Date(d.lhs)).getTime();
      }

      // ObjectId
      if (d.lhs && 'function' === typeof d.lhs.equals) {
        return !d.lhs.equals(d.rhs);
      }

      break;
    }

    return true;
  })
  .forEach(function (d) {
    var path = base_path.concat(d.path),
      obj,
      sub_differences = [];

    //console.log(
    //  require("util").inspect(d, {depth:null, colors:true})
    //);

    switch (d.kind) {
    case 'N':
    case 'E':
      obj = {
        action: 'modify',
        lhs: (d.lhs || null),
        rhs: (d.rhs || null)
      };
      break;

    case 'A':
      path.push(parseInt(d.index, 10));

      if (d.item.kind != "D") {
        obj = {
          action: 'add',
          lhs: null,
          rhs: null // TODO this could be filled...
        };

        // check left and right are not both null/undefined
        var all_nulls = true;
        Object.keys(d.item.rhs).forEach(function(k) {
          if (d.item.rhs[k] != null ||
            (d.item.lhs != null && d.item.lhs[k] != null)) {
            all_nulls = false;
          }
        });

        if (all_nulls) { // all nulls ? do not audit anything
          break;
        }

        var ref_obj = {};
        Object.keys(d.item.rhs).forEach(function(k) {
          ref_obj[k] = Array.isArray(d.item.rhs[k]) ? [] : {};
        });

        sub_differences = sub_differences.concat(
          get_audit_diff(ref_obj, d.item.rhs, doc, options, path)
        );
        break;
      }

      // jshint -W086
    case 'D':
      obj = {
        action: 'delete',
        lhs: d.lhs,
        rhs: null
      };

      break;
    }
    // jshint +W086

    obj.src = doc;
    obj.src__v = doc.__v;

    if (options.labelCallback) {
      obj.label = options.labelCallback(path, doc);
    }
    if (options.typeCallback) {
      obj.type = options.typeCallback(path, doc);
    }
    if (options.userCallback) {
      obj.user = options.userCallback(path, doc);
    }

    if (
      (options.filterAuditCallback && options.filterAuditCallback(obj, path, doc))
      ||
      !options.filterAuditCallback
    ) {
      differences.push(obj);
      differences = differences.concat(sub_differences);
    }

  });

  //console.log("\n\n(audit) final differences\n", differences);

  return differences;
}
