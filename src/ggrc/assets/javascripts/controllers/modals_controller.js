/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

(function(can, $) {

can.Control("GGRC.Controllers.Modals", {
  BUTTON_VIEW_DONE : GGRC.mustache_path + "/modals/done_buttons.mustache"
  , BUTTON_VIEW_CLOSE : GGRC.mustache_path + "/modals/close_buttons.mustache"
//  BUTTON_VIEW_SAVE
  , BUTTON_VIEW_SAVE_CANCEL : GGRC.mustache_path + "/modals/save_cancel_buttons.mustache"
//  BUTTON_VIEW_SAVE_CANCEL_DELETE

  , defaults : {
    content_view : GGRC.mustache_path + "/help/help_modal_content.mustache"
    , header_view : GGRC.mustache_path + "/modals/modal_header.mustache"
    , button_view : null
    , model : null    // model class to use when finding or creating new
    , instance : null // model instance to use instead of finding/creating (e.g. for update)
    , new_object_form : false
    , find_params : {}
  }

  , init : function() {
    this.defaults.button_view = this.BUTTON_VIEW_DONE;
  }
}, {
  init : function() {
    this.options.$header = this.element.find(".modal-header");
    this.options.$content = this.element.find(".modal-body");
    this.options.$footer = this.element.find(".modal-footer");
    this.on();
    this.fetch_all();
  }

  , fetch_templates : function(dfd) {
    var that = this;
    dfd = dfd ? dfd.then(function() { return that.options; }) : $.when(this.options);
    return $.when(
      can.view(this.options.content_view, dfd)
      , can.view(this.options.header_view, dfd)
      , can.view(this.options.button_view, dfd)
    ).done(this.proxy('draw'));
  }

  , fetch_data : function(params) {
    var that = this;
    var dfd;
    if (this.options.instance) {
      dfd = this.options.instance.refresh();
    } else if (this.options.model) {
      dfd = this.options.new_object_form
          ? $.when(this.options.instance = new this.options.model(params || this.find_params()))
          : this.options.model.findAll(params || this.find_params()).then(function(data) {
            var h;
            if(data.length) {
              that.options.instance = data[0];
              return data[0].refresh(); //have to refresh (get ETag) to be editable.
            } else {
              that.options.new_object_form = true;
              that.options.instance = new that.options.model(params || that.find_params());
              return that.options.instance;
            }
          });
    } else {
      this.options.instance = new can.Observe(params || this.find_params());
      dfd = new $.Deferred().resolve(this.options.instance);
    }
    
    return dfd;
  }

  , fetch_all : function() {
    return this.fetch_templates(this.fetch_data(this.find_params()));
  }

  , find_params : function() {
    return this.options.find_params;
  }

  , draw : function(content, header, footer) {
    can.isArray(content) && (content = content[0]);
    can.isArray(header) && (header = header[0]);
    can.isArray(footer) && (footer = footer[0]);

    header != null && this.options.$header.find("h2").html(header);
    content != null && this.options.$content.html(content).removeAttr("style");
    footer != null && this.options.$footer.html(footer);

    this.options.$content.find("input:first").focus();

    this.element.find('.wysihtml5').each(function() {
      $(this).cms_wysihtml5();
    });
    can.each(this.options.$content.find("form").serializeArray(), this.proxy("set_value"));
  }

  , "input, textarea, select change" : function(el, ev) {
    var value = el.val();
    this.set_value({name : el.attr("name"), value : value });
  }

  , set_value : function(item) {
    var instance = this.options.instance;
    if(!(instance instanceof this.options.model)) {
      instance = this.options.instance
               = new this.options.model(instance && instance.serialize ? instance.serialize() : instance);
    }
    var name = item.name.split(".")
      , $elem, value;
    $elem = this.options.$content.find("[name='" + item.name + "']");

    if (typeof(item.value) == 'undefined') {
      value = $elem.val();
      if($elem.attr("numeric") && isNaN(parseInt(value, 10))) {
        value = null;
      }
    } else if ($elem.is("[type=checkbox]")) {
      value = $elem.is(":checked");
    } else {
      value = item.value;
    }
    if(name.length > 1) {
      if(can.isArray(value)) {
        value = new can.Observe.List(can.map(value, function(v) { return new can.Observe({}).attr(name.slice(1).join("."), v); }));
      } else {
        value = new can.Observe({}).attr(name.slice(1).join("."), value);
      }
    }
    instance.attr(name[0], value);
  }

  , "{$footer} a.btn[data-toggle='modal-submit']:not(.disabled) click" : function(el, ev) {
    var instance = this.options.instance
    , that = this
    , ajd;

    can.each(this.options.$content.find("form").serializeArray(), this.proxy("set_value"));

    ajd = instance.save().done(function() {
      that.element.modal_form("hide");
    }).fail(function(xhr, status) {
      el.trigger("ajax:flash", { error : xhr.responseText });
    });
    this.bindXHRToButton(ajd, el, "Saving, please wait...");
  }

  , " ajax:flash" : function(el, ev, mesg) {
    var that = this;
    this.options.$content.find(".flash").length || that.options.$content.prepend("<div class='flash'>");

    can.each(["success", "warning", "error"], function(type) {
      var tmpl;
      if(mesg[type]) {
        tmpl = '<div class="alert alert-'
        + type
        +'"><a href="#" class="close" data-dismiss="alert">&times;</a><span>'
        + mesg[type]
        + '</span></div>';
        that.options.$content.find(".flash").append(tmpl);
      }
    });
  }

  , destroy : function() {
    if(this.options.model && this.options.model.cache) {
      delete this.options.model.cache[undefined];
    }
    this._super && this._super.apply(this, arguments);
  }
});

})(window.can, window.can.$);
