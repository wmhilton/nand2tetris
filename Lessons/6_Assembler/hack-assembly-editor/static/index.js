// Generated by CoffeeScript 1.6.3
(function() {
  var Range, init, parseLine;

  Range = ace.require("ace/range").Range;

  init = function() {
    var AsmFile, Instruction, SymbolRow, SymbolRowView, SymbolTable, SymbolTableView, asm_editor, asm_session, hack_editor, hack_session, inst, row, tokens, _i, _ref;
    asm_editor = ace.edit("asm_editor");
    asm_session = asm_editor.getSession();
    asm_editor.setTheme("ace/theme/monokai");
    asm_session.setMode("ace/mode/asm");
    asm_editor.setOption("firstLineNumber", 0);
    document.getElementById("asm_editor").style.fontSize = "12pt";
    hack_editor = ace.edit("hack_editor");
    hack_session = hack_editor.getSession();
    hack_editor.setTheme("ace/theme/monokai");
    hack_session.setMode("ace/mode/hack");
    document.getElementById("hack_editor").style.fontSize = "12pt";
    hack_editor.renderer.setShowGutter(false);
    asm_session.on("changeScrollTop", function(scroll) {
      hack_session.setScrollTop(parseInt(scroll) || 0);
    });
    hack_session.on("changeScrollTop", function(scroll) {
      asm_session.setScrollTop(parseInt(scroll) || 0);
    });
    document.getElementById("editors").style.visibility = "visible";
    Instruction = Backbone.Model.extend({
      defaults: {
        line_num: null,
        final_line_num: null,
        type: null,
        dest: null,
        comp: null,
        jump: null,
        sym: null,
        literal: null
      },
      isInstruction: function() {
        return this.attributes.type === "A" || this.attributes.type === "C";
      },
      renderHack: function(symtable) {
        var a, address2hack, comp, comp2hack, dest2hack, jump2hack, l, pad15, s, symbol;
        address2hack = function(num) {
          var i, out, temp, _i, _results;
          out = "";
          _results = [];
          for (i = _i = 0; _i <= 15; i = ++_i) {
            temp = Math.pow(2, i);
            if (num > temp) {
              out += "1";
              _results.push(num -= temp);
            } else {
              _results.push(out += "0");
            }
          }
          return _results;
        };
        dest2hack = {
          "null": "000",
          M: "001",
          D: "010",
          MD: "011",
          A: "100",
          AM: "101",
          AD: "110",
          AMD: "111"
        };
        jump2hack = {
          "null": "000",
          JGT: "001",
          JEQ: "010",
          JGE: "011",
          JLT: "100",
          JNE: "101",
          JLE: "110",
          JMP: "111"
        };
        comp2hack = {
          "0": "101010",
          "1": "111111",
          "-1": "111010",
          "D": "001100",
          "X": "110000",
          "!D": "001101",
          "!X": "110001",
          "-D": "001111",
          "-X": "110011",
          "D+1": "011111",
          "X+1": "110111",
          "D-1": "001110",
          "X-1": "110010",
          "D+X": "000010",
          "D-X": "010011",
          "X-D": "000111",
          "D&X": "000000",
          "D|X": "010101"
        };
        pad15 = function(n) {
          return ("000000000000000" + n).slice(-15);
        };
        switch (this.get("type")) {
          case "label":
            return "";
          case "A":
            l = this.get("literal");
            if (l != null) {
              a = pad15(l.toString(2));
            } else {
              s = this.get("sym");
              if (s != null) {
                symbol = symtable.findWhere({
                  sym: s
                });
                a = symbol == null ? "!!!!!!!!!!!!!!!" : pad15(symbol.get("address").toString(2));
              } else {
                a = "???????????????";
              }
            }
            return "0" + a;
          case "C":
            a = this.get("comp").search("M") > -1 ? "1" : "0";
            comp = this.get("comp").replace(/A|M/, "X");
            return "111" + a + comp2hack[comp] + dest2hack[this.get("dest")] + jump2hack[this.get("jump")];
        }
        return "";
      }
    });
    AsmFile = Backbone.Collection.extend({
      model: Instruction,
      comparator: "line_num",
      initialize: function() {
        return this.on("change:type add", function(model, collection, options) {
          return this.computeFinalLineNumbers();
        });
      },
      renumber: function(start_row, offset) {
        var model, _i, _len, _ref, _results;
        _ref = this.models.slice(start_row);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          model = _ref[_i];
          _results.push(model.set({
            line_num: model.attributes.line_num + offset
          }));
        }
        return _results;
      },
      insertLines: function(start_row, num_lines) {
        var row, _i, _ref;
        console.log("Inserting " + num_lines + " lines at " + start_row);
        if (num_lines === 0) {
          return;
        }
        this.renumber(start_row, num_lines);
        for (row = _i = start_row, _ref = start_row + num_lines - 1; start_row <= _ref ? _i <= _ref : _i >= _ref; row = start_row <= _ref ? ++_i : --_i) {
          this.add({
            line_num: row
          });
        }
        this.computeFinalLineNumbers();
      },
      removeLines: function(start_row, num_lines) {
        var row, _i, _ref;
        console.log("Removing " + num_lines + " lines at " + start_row);
        if (num_lines === 0) {
          return;
        }
        for (row = _i = start_row, _ref = start_row + num_lines; start_row <= _ref ? _i < _ref : _i > _ref; row = start_row <= _ref ? ++_i : --_i) {
          this.remove(this.findWhere({
            line_num: row
          }));
        }
        this.renumber(start_row, -num_lines);
        this.computeFinalLineNumbers();
      },
      computeFinalLineNumbers: function() {
        var count, model, r, _i, _ref;
        count = 0;
        for (r = _i = 0, _ref = this.models.length; 0 <= _ref ? _i < _ref : _i > _ref; r = 0 <= _ref ? ++_i : --_i) {
          model = this.models[r];
          if (model.isInstruction()) {
            model.set({
              final_line_num: count
            });
            count = count + 1;
          }
        }
      },
      renderHack: function(model, symtable) {
        var row, text;
        console.log(model);
        if (model == null) {
          console.log("WWWWTTTFFF");
        }
        row = model.get("line_num");
        text = model.renderHack(symtable);
        if (model != null ? model.isInstruction() : void 0) {
          text = model.attributes.final_line_num + ": " + text;
        }
        return text;
      }
    });
    window.code = new AsmFile;
    window.asm_session = asm_session;
    SymbolRow = Backbone.Model.extend({
      defaults: {
        sym: null,
        address: null,
        address_rows: [],
        line_num: null,
        ref_count: null,
        rom: false,
        label_row: null
      },
      inc: function(row) {
        this.attributes.address_rows.append(row);
        this.attributes.address_rows.sort();
        this.set({
          ref_count: this.attributes.address_rows.length
        });
        return this.update_line_num();
      },
      dec: function(row) {
        var r;
        r = this.attributes.address_rows.indexOf(row);
        this.attributes.address_rows.splice(r, 1);
        this.attributes.address_rows.sort();
        this.set({
          ref_count: this.attributes.address_rows.length
        });
        return this.update_line_num();
      },
      update_line_num: function() {
        if (this.attributes.address_rows.length === 0) {
          return this.set({
            line_num: null
          });
        } else {
          return this.set({
            line_num: this.attributes.address_rows[0]
          });
        }
      }
    });
    SymbolTable = Backbone.Collection.extend({
      model: SymbolRow,
      comparator: "line_num",
      initialize: function() {
        this.on("remove", function(model, collection, options) {
          model.destroy();
          return this.calc_addresses();
        });
        return this.on("add", function(model, collection, options) {
          return this.calc_addresses();
        });
      },
      calc_addresses: function() {
        var i, model, _i, _len, _ref, _results;
        _ref = this.models;
        _results = [];
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          model = _ref[i];
          _results.push(model.set({
            address: 16 + i
          }));
        }
        return _results;
      },
      reference: function(symname, row) {
        var symrow;
        if (symname == null) {
          return;
        }
        symrow = this.findWhere({
          sym: symname
        });
        if (symrow != null) {
          return symrow.inc(row);
        } else {
          return this.add({
            sym: symname,
            ref_count: 1
          });
        }
      },
      dereference: function(symname, row) {
        var symrow;
        symrow = this.findWhere({
          sym: symname,
          address_row: row
        });
        if (symrow != null) {
          if (symrow.get("ref_count") === 1) {
            console.log("DESTROY!");
            return this.remove(symrow);
          } else {
            return symrow.dec(row);
          }
        } else {
          return console.log("Bug: dereferenced a symbol that doesn't exist.");
        }
      },
      label: function(symname, row) {
        var symrow;
        symrow = this.findWhere({
          sym: symname
        });
        if (symrow != null) {
          return symrow.set({
            label_row: row
          });
        }
      }
    });
    window.symtable = new SymbolTable;
    SymbolRowView = Backbone.View.extend({
      tagName: "tr",
      template: _.template("<td><div><%- sym %></div></td><td><%- address %></td><td><%- ref_count %></td><td><%- label_row %></td>"),
      initialize: function() {
        this.listenTo(this.model, "change", this.render);
        return this.listenTo(this.model, "destroy", this.remove);
      },
      render: function() {
        this.$el.html(this.template(this.model.attributes));
        return this;
      }
    });
    SymbolTableView = Backbone.View.extend({
      tagName: "table",
      template: _.template("<tr><th>Symbol</th><th>Address</th><th>Ref</th><th>Label?</th></tr>"),
      initialize: function() {
        return this.listenTo(this.model, "add", function(model, collection, options) {
          return this.$el.append((new SymbolRowView({
            model: model
          })).render().$el);
        });
      },
      render: function() {
        this.$el.html(this.template());
        this.model.models.map(function(model) {
          return new SymbolRowView({
            model: model
          }.map((function(view) {
            return this.$el.append(view.render().$el);
          }), this));
        });
        return this;
      }
    });
    window.SymbolTableView = SymbolTableView;
    window.SymbolRowView = SymbolRowView;
    window.hackSetLine = function(row, text) {
      var i, range, _i, _ref, _ref1;
      if (row >= hack_session.getLength()) {
        for (i = _i = _ref = hack_session.getLength() - 1, _ref1 = row - 1; _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
          hack_session.insert({
            row: i,
            column: Number.MAX_VALUE
          }, '\n');
        }
      }
      range = new Range(row, 0, row, Number.MAX_VALUE);
      return hack_session.replace(range, text);
    };
    code.on("remove", function(model) {
      if (model.attributes.sym != null) {
        symtable.dereference(model.attributes.sym, model.attributes.line_num);
      }
      if (hack_session.getLength() > code.length) {
        return hack_session.getDocument().removeLines(code.length, hack_session.getLength() - 1);
      }
    });
    code.on("add", function(model, options) {
      var row, text;
      if (model.attributes.sym != null) {
        symtable.reference(model.attributes.sym, model.attributes.line_num);
        if (model.attributes.type === "label") {
          symtable.label(model.attributes.sym, model.attributes.line_num);
        }
      }
      row = model.get("line_num");
      text = code.renderHack(model, symtable);
      return hackSetLine(row, text);
    });
    code.on("change:sym", function(model, options) {
      if (model._previousAttributes.sym != null) {
        symtable.dereference(model._previousAttributes.sym, model._previousAttributes.line_num);
      }
      return symtable.reference(model.attributes.sym, model.attributes.line_num);
    });
    code.on("change:type", function(model, options) {
      if (model._previousAttributes.type === "label") {
        return console.log("TODO");
      }
    });
    code.on("change", function(model, options) {
      var row, text;
      row = model.get("line_num");
      text = code.renderHack(model, symtable);
      return hackSetLine(row, text);
    });
    window.hack = function() {
      var model, _i, _len, _ref;
      hack_session.setValue("");
      _ref = code.models;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        model = _ref[_i];
        hackSetLine(model.get("line_num"), model.renderHack(symtable));
      }
    };
    window.check = function() {
      var i, _i, _ref;
      for (i = _i = 0, _ref = code.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        console.log(i + "->" + code.at(i).get("line_num"));
      }
    };
    for (row = _i = 0, _ref = asm_session.getLength(); 0 <= _ref ? _i < _ref : _i > _ref; row = 0 <= _ref ? ++_i : --_i) {
      console.log(row);
      tokens = asm_session.getTokens(row);
      inst = new Instruction;
      inst.set({
        line_num: row
      });
      parseLine(tokens, inst);
      code.add(inst);
    }
    window.symtable_view = new SymbolTableView({
      model: symtable,
      el: $('#symboltable')
    });
    symtable_view.render();
    console.log("nocrash");
    return asm_session.on("change", function(e) {
      var end, num_rows, start, _j, _k, _l, _results, _results1, _results2;
      start = e.data.range.start.row;
      end = e.data.range.end.row;
      console.log(e.data.action + " " + start + "->" + end);
      num_rows = end - start;
      switch (e.data.action) {
        case "insertLines":
          code.insertLines(start, num_rows);
          _results = [];
          for (row = _j = start; start <= end ? _j <= end : _j >= end; row = start <= end ? ++_j : --_j) {
            tokens = asm_session.getTokens(row);
            _results.push(parseLine(tokens, code.at(row)));
          }
          return _results;
          break;
        case "insertText":
          if (e.data.text === "\n") {
            console.log("NEWLINE " + "(" + e.data.range.start.row + "," + e.data.range.start.column + ")->(" + e.data.range.end.row + "," + e.data.range.end.column + ")");
            code.insertLines(end, 1);
          }
          _results1 = [];
          for (row = _k = start; start <= end ? _k <= end : _k >= end; row = start <= end ? ++_k : --_k) {
            tokens = asm_session.getTokens(row);
            _results1.push(parseLine(tokens, code.at(row)));
          }
          return _results1;
          break;
        case "removeText":
          code.removeLines(start, num_rows);
          _results2 = [];
          for (row = _l = start; start <= end ? _l <= end : _l >= end; row = start <= end ? ++_l : --_l) {
            tokens = asm_session.getTokens(row);
            _results2.push(inst = parseLine(tokens, code.at(row)));
          }
          return _results2;
          break;
        case "removeLines":
          return code.removeLines(start, num_rows);
      }
    });
  };

  parseLine = function(tokens, inst) {
    var o, t, tokensearch, _i, _len;
    tokensearch = function(token, regex) {
      return token.type.search(regex) > -1;
    };
    o = {
      type: null,
      dest: null,
      comp: null,
      jump: null,
      sym: null,
      literal: null
    };
    for (_i = 0, _len = tokens.length; _i < _len; _i++) {
      t = tokens[_i];
      if (tokensearch(t, /\bdest\b/)) {
        o.dest = t.value;
      } else if (tokensearch(t, /\bcomp\b/)) {
        o.type = "C";
        o.comp = t.value;
      } else if (tokensearch(t, /\bjump\b/)) {
        o.jump = t.value;
      } else if (tokensearch(t, /\baddress_op\b/)) {
        o.type = "A";
      } else if (tokensearch(t, /\bsymbol\b/)) {
        o.sym = t.value;
        if (tokensearch(t, /\blabel\b/)) {
          o.type = "label";
        }
      } else if (tokensearch(t, /\bliteral\b/)) {
        o.literal = parseInt(t.value);
      }
    }
    inst.set(o);
  };

  init();

}).call(this);

/*
//@ sourceMappingURL=index.map
*/