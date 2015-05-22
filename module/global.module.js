modules.global = {
	name: "global",
	dText: "Global",
	loaded: false,
	loadModule: function(mOptions) {
		this.loaded = true;
		var module_name = this.name;
		var dbg = function() {
			utils.dbg(module_name, arguments);
		};

		dbg("[Init] Loading module");
		// Loading all functions used

		var listenToCtrlEnter = function() {
			dbg("[CtrlEnterValidator] Listening to keys");
			$(document).on('keydown', 'textarea', function(e) {
				if(!opt.get(module_name, "form_validation") || (!e.ctrlKey && !e.metaKey)) {
					return;
				}

				if (e.which == 13) {
					var submitButton = $(this).closest('form').find('input[type=submit]');
					if(!submitButton.length) {
						submitButton = $(this).closest('tbody').find('input[value=" Envoyer "]');
					}
					submitButton.click();
				}
			});
		};

		var listenToBBCodeShortcuts = function() {
			dbg("[BBCodeShortcuts] Listening to keys");
			$(document).on('keydown', "form textarea", function(e) {
				if(!opt.get(module_name, "bbcode_shortcuts") || (!e.ctrlKey && !e.metaKey)) {
					return;
				}

				if(!$("#bbsmiles").length) {
					return;
				}

				var bbcode = false;
				switch(e.which) {
					case 66: // B
						bbcode = 'Gras';
						break;
					case 73: // I
						bbcode = 'Italique';
						break;
					case 85: // U
						bbcode = 'Souligner';
						break;
					case 81: // Q
						bbcode = 'Citer';
						break;
					default:
						return;
				}

				e.preventDefault();
				dbg("[BBCodeShortcuts] Got a BBCode key : %s", bbcode);
				$("#bbsmiles").find("img[alt='" + bbcode + "']").click();
			});
		};

		var getOptionChilds = function(module_name, parent) {
			var childs = [];
			$.each(opt.options[module_name], function(option, oData) {
				if(oData.parent && oData.parent == parent) {
					childs.push(option);
					childs.concat(getOptionChilds(module_name, option));
				}
			});
			return childs;
		};

		var createOptionInput = function(module_name, option_name, oData) {
			var optionHtml = "";
			if(oData.type == 'select') {
				var optionChoices = "";
				$.each(oData.choices, function(k, optionChoice) {
					optionChoices += '<option value="' + optionChoice + '"' + (oData.val == optionChoice ? ' selected="selected"' : '') + '>' + optionChoice + '</option>';
				});
				optionHtml = '<select id="sti_' + module_name + '_' + option_name + '" ' + (oData.parent && !opt.get(module_name, oData.parent) ? 'disabled="disabled" ': '') + '>' + optionChoices + '</select><label for="sti_' + module_name + '_' + option_name + '"' + (oData.tooltip ? ' title="' + oData.tooltip + '"' : '') + '>' + oData.dispText + '</label><br />';
			}
			else if(oData.type == 'text') {
				optionHtml = '<input type="text" id="sti_' + module_name + '_' + option_name + '" ' + (oData.parent && !opt.get(module_name, oData.parent) ? 'disabled="disabled" ': '') + 'value="' + opt.get(module_name, option_name) + '"' + ' size="' + oData.width + '"/> <input id="sti_' + module_name + '_' + option_name + '_savebutton" type="button" value="Ok"/> <label for="sti_' + module_name + '_' + option_name + '"' + (oData.tooltip ? ' title="' + oData.tooltip + '"' : '') + '>' + oData.dispText + '</label><br />';
			}
			else {
				optionHtml = '<input type="checkbox" id="sti_' + module_name + '_' + option_name + '" ' + (oData.parent && !opt.get(module_name, oData.parent) ? 'disabled="disabled" ': '') + (opt.get(module_name, option_name) ? 'checked="checked"' : '') + '/><label for="sti_' + module_name + '_' + option_name + '"' + (oData.tooltip ? ' title="' + oData.tooltip + '"' : '') + '>' + oData.dispText + '</label><br />';
			}
			if(oData.sub_options) {
				var subOptionHtml = "";
				$.each(oData.sub_options, function(s_option, s_oData) {
					if(s_oData.showInOptions) {
						subOptionHtml += '<span id="sti_' + module_name + '_' + option_name + '_' + s_option + '_span"><input type="checkbox" id="sti_' + module_name + '_' + option_name + '_' + s_option + '" ' + (opt.sub_get(module_name, option_name, s_option) ? 'checked="checked"' : '') + '/><label for="sti_' + module_name + '_' + option_name + '_' + s_option + '"' + (s_oData.tooltip ? ' title="' + s_oData.tooltip + '"' : '') + '>' + s_oData.dispText + '</label><br /></span>';
					}
				});
				optionHtml += '<div id="sti_' + module_name + '_s_' + option_name + '" class="sti_options_sub">' + subOptionHtml + '</div>';
			}
			return '<span id="sti_' + module_name + '_' + option_name + '_span"' + (oData.indicateParent ? 'class="sti_opt_has_parent"' : '') + '>' + optionHtml + '</span>';
		};

		var createOptionsFrame = function() {
			var optionsFrameData = "";
			// Full options pannel
			var optionsFrameHeader = '<div class="sti_options_header_button">Tout</div>';

			dbg("[Options] Building frame");
			$.each(opt.options, function(module_name, options) {
				var optionsSection = '<div id="sti_options_data_' + module_name + '" class="sti_options_section"><div class="sti_frame_section_header">' + modules[module_name].dText + '</div>';
				var showSection = false;
				$.each(options, function(option, oData) {
					if(oData.showInOptions) {
						optionsSection += createOptionInput(module_name, option, oData);
						showSection = true;
					}
				});
				optionsSection += '</div>';
				if(showSection) {
					// If there is no options to be shown for this section, just skip the whole div
					optionsFrameHeader += '<div class="sti_options_header_button" section="' + module_name + '">' + modules[module_name].dText + '</div>';
					optionsFrameData += optionsSection;
				}
			});

			var onCloseCallback = function() {
				var section = $(".sti_options_header_button_selected").attr("section");
				opt.set(module_name, "options_section", section);
			};

			var buttons = [ { b_id: "im_export", b_text: "Importer/Exporter", b_callback: createImportExportFrame } ];

			// { id, classes, title, header, data, relativeToId, relativeToObj, relativeToWindow, top, left, css, buttons = [ /* close is by default */ { b_id, b_text, b_callback} ], underButtonsText }
			var copyright = '<a href="/forums.php?action=viewtopic&topicid=454">STi</a> by <a href="/sotorrent.php?id=11737">SillyTwix</a><span class="sti_debug">.</span>';
			appendFrame({ id: "options", title: "STi Options", data: optionsFrameData, relativeToId: "navigation", top: 8, left: 230, buttons: buttons, header: optionsFrameHeader, onCloseCallback: onCloseCallback, underButtonsText: copyright });

			$.each(opt.options, function(module_name, options) {
				if(!$("#sti_options_data_" + module_name).length) {
					// Since the section is not even shown, don't cycle through all options
					return;
				}

				$.each(options, function(option, oData) {
					if(oData.showInOptions) {
						var childs = getOptionChilds(module_name, option);

						if(!oData.type || oData.type == 'select') {
							$("#sti_" + module_name + "_" + option).change(function() {
								var state = null;
								if($(this).is('select')) {
									state = $(this).val();
								}
								else {
									state = $(this).prop("checked");
								}
								opt.set(module_name, option, state);
								dbg("[Options] [%s] [%s] is %s", module_name, option, opt.get(module_name, option));
								if(oData.callback) {
									oData.callback(state);
								}
								if(oData.sub_options) {
									if(state) {
										$("#sti_" + module_name + "_s_" + option).slideDown();
									}
									else {
										$("#sti_" + module_name + "_s_" + option).slideUp();
									}
								}

								if(childs.length) {
									$.each(childs, function(i, child) {
										if(state) {
											$("#sti_" + module_name + "_" + child).prop("disabled", false);
										}
										else {
											$("#sti_" + module_name + "_" + child).prop("checked", false);
											$("#sti_" + module_name + "_" + child).triggerHandler("change");
											$("#sti_" + module_name + "_" + child).prop("disabled", true);
										}
									});
								}
							});
						}
						else if(oData.type == 'text') {
							$("#sti_" + module_name + "_" + option + "_savebutton").click(function() {
								var val = $("#sti_" + module_name + "_" + option).val();
								if(oData.regex) {
									if(!oData.regex.test(val)) {
										opt.set(module_name, option, oData.defaultVal);
										$("#sti_" + module_name + "_" + option).val(opt.get(module_name, option));
										return;
									}
								}
								opt.set(module_name, option, val);
								dbg("[Options] [%s] [%s] is %s", module_name, option, opt.get(module_name, option));
								if(oData.callback) {
									oData.callback(state);
								}
							});
						}

						if(oData.sub_options) {
							$.each(oData.sub_options, function(s_option, s_oData) {
								$("#sti_" + module_name + "_" + option + "_" + s_option).change(function() {
									if(s_oData.showInOptions) {
										opt.sub_set(module_name, option, s_option, $(this).prop("checked"));
										dbg("[Options] [%s] [%s][%s] is %s", module_name, option, s_option, opt.sub_get(module_name, option, s_option));
									}
								});
							});
							if(!opt.get(module_name, option)) {
								$("#sti_" + module_name + "_s_" + option).hide();
							}
						}

						if(oData.parent) {
							$("#sti_" + module_name + "_" + option + "_span").hover(function() {
								$("#sti_" + module_name + "_" + oData.parent + "_span").addClass("sti_option_required");
							}, function() {
								$("#sti_" + module_name + "_" + oData.parent + "_span").removeClass("sti_option_required");
							});
						}
					}
				});
			});

			$(".sti_options_header_button").hover(function() {
				$(".sti_options_header_button").removeClass("sti_options_header_button_selected");
				$(this).addClass("sti_options_header_button_selected");
					
				var section = $(this).attr("section");
				if(section) {
					$(".sti_options_section").hide();
					$("#sti_options_data_" + section).show();
				}
				else {
					$(".sti_options_section").show();
				}
			}, function() {});

			var section = opt.get(module_name, "options_section");
			if(section) {
				$(".sti_options_header_button[section=" + section + "]").trigger("mouseenter");
			}
			else {
				$(".sti_options_header_button:first-child").trigger("mouseenter");
			}

			$(".sti_debug").dblclick(function() {
				DEBUG = !DEBUG;
				opt.set("global", "debug", DEBUG);
			});

			dbg("[Options] Frame ready");
		};

		var createImportExportFrame = function() {
			$("#sti_options_close").click();

			dbg("[Export] Generate link");
			var savedData = { opt: opt.exportAll(), gData: gData.exportAll() };
			var blob = new Blob([JSON.stringify(savedData)], {type: "application/json"});
			var url  = URL.createObjectURL(blob);

			var frameData = [
				'<div class="sti_frame_section_header">Exporter</div>',
				'<a href="' + url + '" download="sti.backup.json">Télécharger l\'export des options</a>',
				'<div class="sti_frame_section_header">Importer</div>',
				'<input id="import_file" type="file" />',
				'<div id="import_result"></div>'
			];
			appendFrame({ id: "im_export", title: "STi Import/Export", data: frameData.join(""), relativeToId: "navigation", top: 8, left: 230 });
			$("#import_file").change(function() {
				var result = $("#import_result");
				dbg("[Import] Got file");
				result.html("Ouverture du fichier");
				var fileInput = $(this).get(0).files[0];
				if(fileInput) {
					var reader = new FileReader();
					reader.onload = function(e) {
						dbg("[Import] Reading file");
						result.html(result.html() + "<br />Lecture en cours");
						var file = e.target.result;
						if(file) {
							var obj = JSON.parse(file);
							if(obj && obj["opt"]) {
								dbg("[Import] Importing opt");
								result.html(result.html() + "<br />Import des options");
								opt.importAll(obj["opt"]);
							}
							if(obj && obj["gData"]) {
								dbg("[Import] Importing gData");
								result.html(result.html() + "<br />Import des données");
								gData.importAll(obj["gData"]);
							}
						}
						result.html(result.html() + "<br />Importation terminée. La page va être rafraîchie.");
						setTimeout(function() { window.location.reload(); }, 5000);
					};
					reader.readAsText(fileInput);
				}
			});
		};

		var timeOffsets = {
			"bookmarks": 24 * 60 * 60 * 1000,
		};
		var isDataUsable = function(data) {
			return new Date().getTime() < (gData.get(data, "last_check") + timeOffsets[data]);
		};
		modules.global.isDataUsable = isDataUsable;

		var fetchBookmarks = function(force) {
			if(!force && isDataUsable("bookmarks")) {
				return;
			}
			dbg("[fetchBookmarks] Grab bookmarks");
			var snatchedUrl = { host: pageUrl.host, path: "/bookmark.php" };
			utils.grabPage(snatchedUrl, function(data) {
				parseBookmarks($(data).find("#bookmark_list tr:not(:first)"));
			});
		};
		modules.global.fetchBookmarks = fetchBookmarks;

		var parseBookmarks = function(torrents) {
			gData.setFresh("bookmarks");
			if(!torrents.length) {
				dbg("[parseBookmarks] No bookmarks found - Bail out");
				gData.set("bookmarks", "torrents", []);
				return;
			}

			var torrentIds = [];
			torrents.each(function() {
				var torrentLink = $(this).find("a:nth(0)").attr("href");
				var torrentId = torrentLink.match(/id=(\d+)/)[1];
				torrentIds.push(torrentId);
			});
			gData.set("bookmarks", "torrents", torrentIds);
			dbg("[parseBookmarks] Found %d bookmarks", torrentIds.length);
		};
		modules.global.parseBookmarks = parseBookmarks;

		var refreshBookmarksOnBookmark = function() {
			$(document).on("click", "a[onclick]", function() {
				var aLink = $(this);
				if(aLink.attr("onclick").indexOf("AutoBook") != -1) {
					dbg("[bookmarkRefresh] Bookmark added - Force refresh");
					fetchBookmarks(true);
					if($(this).parent().hasClass("added")) {
						var cross = $(this).parents("tr").prev().find("td:nth(1) img:nth(0)");
						if(cross && gData.get("bookmarks", "torrents").indexOf(cross.attr("id").substring(10)) == -1) {
							cross.after(' <img class="remove_bookmark_star" src="' + chrome.extension.getURL("images/bookmark.png") + '" />');
						}
					}
				}
			});
		};

		dbg("[Init] Starting");
		// Execute functions

		var optionsFrameButtons = '<li><a href="#" id="options_sti">STi Options</a></li>';
		$("#navig_bloc_user ul").append(optionsFrameButtons);
		$("#options_sti").click(function() {
			if($("#sti_options").length) {
				var optionsFrame = $("#sti_options");
				if(optionsFrame.is(":visible")) {
					optionsFrame.hide();
				}
				else {
					optionsFrame.show();
				}
			}
			else {
				createOptionsFrame();
			}
			return false;
		});

		listenToCtrlEnter();
		listenToBBCodeShortcuts();
		fetchBookmarks();
		refreshBookmarksOnBookmark();

		dbg("[Init] Ready");
	}
};