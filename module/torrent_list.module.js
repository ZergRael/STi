modules.torrent_list = {
	name: "torrent_list",
	dText: "Liste torrents",
	pages: [
		{ path_name: "/|/index.php", options: { buttons: "#sort", canRefresh: true, canMark: true, canFilter: true, canSort: true } },
		{ path_name: "/sphinx.php", options: { buttons: ".form_search", buttonsAppend: true, canFilter: true, canSort: true } },
		{ path_name: "/summary.php", options: { } }
	],
	loaded: false,
	loadModule: function(mOptions) {
		this.loaded = true;
		var module_name = this.name;
		var dbg = function() {
			utils.dbg(module_name, arguments);
		};

		dbg("[Init] Loading module");

		var torrentList = [], bookmarksList;
		var tagTorrents = function(torrentLines) {
			dbg("[tagTorrents] Scanning torrents");
			bookmarksList = gData.get("bookmarks", "torrents");
			var jumpMe = true;
			torrentLines.each(function() {
				if(jumpMe) {
					jumpMe = false;
					return;
				}
				jumpMe = true;

				torrentList.push(tagTorrent($(this)));
			});
			dbg("[tagTorrents] Ended scanning");
			return torrentLines;
		};
		modules.endless_scrolling.preInsertion = tagTorrents;

		var tagTorrent = function(node) {
			var t = {node: node, name: node.find("strong").text(), status: {}, shown: true, nextNode: node.next()};
			t.lName = t.name.toLowerCase();
			var imgs = node.find("img");
			$.each(imgs, function() {
				if(bookmarksList) {
					var imgId = $(this).attr("id");
					if(imgId) {
						var id = imgId.substring(10);
						t.id = id;
						if(bookmarksList.indexOf(id) != -1) {
							node.find("img:nth(1)").after(' <img src="' + chrome.extension.getURL("images/bookmark.png") + '" />');
							t.status.bookmark = true;
						}
					}
				}
				switch($(this).attr("alt")) {
					case "Torrent en FreeLeech":
						t.status.freeleech = true;
						break;
					case " Nuke ! ":
						t.status.nuked = true;
						break;
				}
				var tds = node.find("td");
				t.comments = Number(tds.eq(3).text().trim());
				t.completed = Number(tds.eq(5).text().trim());
				t.seed = Number(tds.eq(6).text().trim());
				t.leech = Number(tds.eq(7).text().trim());
			});
			return t;
		};

		var filtersChanged = function() {
			if(!torrentList.length) {
				return;
			}
			refreshFilterSet();
			dbg("[Filters] Filters ready");
			applyFilters();
			dbg("[Filters] Done");
			$(document).trigger("es_dom_process_done");
		};

		var basicFilters = {freeleech: 0, nuked: 0};
		var stringFilters = {original: "", ready: false};
		var refreshFilterSet = function() {
			basicFilters = {freeleech: opt.get(module_name, "filter_freeleech"), nuked: opt.get(module_name, "filter_nuked")};
			var stringFilterString = $("#filter_string").val() || "";
			var noFilterActive = true;
			for(var filter in basicFilters) {
				if(basicFilters[filter] > 0) {
					noFilterActive = false;
				}
			}
			if(opt.get(module_name, "filter_string") && stringFilterString != stringFilters.original) {
				stringFilters = compileStringFilter(stringFilterString);
			}
			if(stringFilters.ready) {
				noFilterActive = false;
			}
			if(noFilterActive) {
				$("#torrent_marker_button").show();
				$("#torrent_finder_button").show();
			}
			else {
				$("#torrent_marker_button").hide();
				$("#torrent_finder_button").hide();
			}
		};

		var applyFilters = function() {
			var showTorrents = [];
			var hideTorrents = [];
			$.each(torrentList, function(index, t) {
				var shouldShow = true;

				// Basic filters
				for(var filter in basicFilters) {
					var filterStatus = basicFilters[filter];
					if(filterStatus == 1) {
						if(!t.status[filter]) {
							shouldShow = false;
						}
					}
					else if(filterStatus == 2) {
						if(t.status[filter]) {
							shouldShow = false;
						}
					}
				}

				// String filter
				if(shouldShow && stringFilters.ready) {
					for(var i in stringFilters.orFilters) { // Loop all || blocks
						for(var j in stringFilters.orFilters[i]) { // Loop && blocks
							var f = stringFilters.orFilters[i][j];
							if(f.fType === 0) {
								if(f.operator === 0) { shouldShow = (t[f.prop] < f.val); }
								else if(f.operator == 1) { shouldShow = (t[f.prop] == f.val); }
								else if(f.operator == 2) { shouldShow = (t[f.prop] > f.val); }
							}
							else if(f.fType == 1) {
								shouldShow = (t.lName.indexOf(f.str) == -1);
							}
							else if(f.fType == 2) {
								shouldShow = (t.lName.indexOf(f.str) > -1);
							}

							if(!shouldShow) { // In a &&, stop loop as soon as one member is false
								break;
							}
						}

						if(shouldShow) { // In a ||, stop loop as soon as one && block is true
							break;
						}
					}
				}

				if(shouldShow && !t.shown) {
					t.shown = true;
					showTorrents.push(t.node, t.nextNode);
				}
				if(!shouldShow && t.shown) {
					t.shown = false;
					hideTorrents.push(t.node, t.nextNode);
				}
			});

			if(showTorrents.length > 0) {
				dbg("[Filters] Showing some %d", showTorrents.length);
				$.each(showTorrents, function() { $(this).show(); });
			}
			if(hideTorrents.length > 0) {
				dbg("[Filters] Hiding some %d", hideTorrents.length);
				$.each(hideTorrents, function() { $(this).hide(); });
			}
		};

		var filterProperties = {c: 'completed', s: 'seed', l: 'leech', m: 'comments'};
		var filterOperators = {'<': 0, '=': 1, '>': 2};
		var compileStringFilter = function(str) {
			var sFilter = {original: str, proper: "", ready: false};
			sFilter.proper = str.toLowerCase().trim();
			if(sFilter.proper !== "") {
				sFilter.ready = true;
				sFilter.orFilters = [];
				var orSplit = sFilter.proper.split("||");
				for(var i in orSplit) {
					var sOr = orSplit[i].trim();
					var andSplit = sOr.split("&&");
					var andFilters = [];
					for(var j in andSplit) {
						var s = andSplit[j].trim();
						var f = {};
						var nFilter = s.match(/\b([cslm])\s*([<=>])\s*(\d+)\b/);
						if(nFilter) {
							f.fType = 0;
							f.prop = filterProperties[nFilter[1]];
							f.operator = filterOperators[nFilter[2]];
							f.val = Number(nFilter[3]);
							dbg("[StringFilter] %s %s %s", f.prop, f.operator, f.val);
						}
						else if(s.indexOf("!") === 0) {
							f.fType = 1;
							f.str = s.substring(1);
							dbg("[StringFilter] NOT %s", f.str);
						}
						else {
							f.fType = 2;
							f.str = s;
							dbg("[StringFilter] %s", f.str);
						}
						andFilters.push(f);
					}
					sFilter.orFilters.push(andFilters);
				}
			}
			return sFilter;
		};

		var recalcAgeColumn = function() {
			if(!opt.get(module_name, "age_column")) {
				return;
			}

			dbg("[AgeCol] Started torrents date recalc");
			var alreadyDated = false;
			$("tbody tr").each(function() {
				if(!$(this).hasClass("head_torrent")) {
					var tds = $(this).find("td");
					if(tds.first().hasClass("alt1")) { // Don't mind the hidden td
						return;
					}
					
					var dateMatch = $(this).next().text().match(/(\d+)\/(\d+)\/(\d+) à (\d+):(\d+)/);
					if(!dateMatch || !dateMatch.length) { // This should never happen
						return;
					}

					// Append our age td
					tds.eq(2).text(simpleDateToDiff(dateMatch));
				}
			});
			dbg("[AgeCol] Ended");
		};

		var simpleDateToDiff = function(dateMatch) {
			// Calculation is done by taking the first not-now date section, in order Y/M/D/h/m
			// At first match, just take the difference between now and torrent date
			// If there's only one unit difference && the date section underneath is still viable, fallback to this smaller date section
			// eg: Date[torrent] = 1/1/2013 23:59, Date[now] = 2/1/2013 1:01 => day_difference() == 1 => fallback to hours => (24 + 1 - 23) => 2h
			// In fact, it's 1h02m but it's closer than 1day
			// In the same thinking process, it can return 24h since it's still viable and more precise than 1day -- Won't return > 24h
			var now = siteRelativeDate;
			var was = new Date(dateMatch[3], dateMatch[2] - 1, dateMatch[1], dateMatch[4], dateMatch[5]);

			var diff = Math.round(now - was) / 1000;
			if(diff < 60) { // Less than 1min
				return "frais";
			}
			else if(diff < 3600) { // Less than 1h
				return Math.round(diff / 60) + "min";
			}
			else if(diff < 86400) { // Less than 1d
				return Math.round(diff / 3600) + "h";
			}
			else if(diff < 2592000) { // Less than 1mo(30d)
				return Math.round(diff / 86400) + "j";
			}
			else if(diff < 31536000) {
				return Math.round(diff / 2592000) + "mo";
			}
			else {
				return Math.round(diff / 31536000) + "a";
			}
		};

		var initColumns = function() {
			var bgHeader = $(".name_torrent_head:first").css("background-color"),
				bg0 = $(".name_torrent_0:first").css("background-color"),
				bg1 = $(".name_torrent_1:first").css("background-color"),
				customCss = [];

			if(bgHeader) {
				customCss.push(".sti_col_head {background-color: " + bgHeader + "}");
			}
			if(bg0) {
				customCss.push(".sti_col_0 {background-color: " + bg0 + "}");
			}
			if(bg1) {
				customCss.push(".sti_col_1 {background-color: " + bg1 + "}");
			}
			$("#sti_css").append(customCss.join(" "));
		}

		var addColumns = function() {
			var autogetCol = opt.get(module_name, "autoget_column");
			var bookmarkCol = opt.get(module_name, "bookmark_column");
			var nfoCol = opt.get(module_name, "nfo_column");
			var ageCol = opt.get(module_name, "age_column");
			dbg("[columns] Started");
			var alreadyProcessed = false;
			$("tbody tr").each(function() { // Process all data & skip already processed, is strangely faster than processing data before insertion
				if($(this).hasClass("head_torrent")) {
					if($(this).hasClass("colmuns_done")) { // If this td head is already processed, assume the same for the whole page
						dbg("[columns] Already processed page");
						alreadyProcessed = true;
						return;
					}
					dbg("[columns] Processing");
					var nameTd = $(this).find("td:nth(1)");
					if(autogetCol) {
						nameTd.after('<td class="sti_col_head autoget_torrent_head">Get</td>');
					}
					if(bookmarkCol) {
						nameTd.after('<td class="sti_col_head bookmark_torrent_head">Bkm</td>');
					}
					if(nfoCol) {
						nameTd.after('<td class="sti_col_head nfo_torrent_head">Nfo</td>');
					}
					if(ageCol) {
						nameTd.after('<td class="sti_col_head age_torrent_head">Age</td>');
					}
					$(this).addClass("colmuns_done");
					alreadyProcessed = false;
				}
				else {
					if(alreadyProcessed) { // Wait until we get to the new page
						return;
					}

					var tds = $(this).find("td");
					if(tds.first().hasClass("alt1")) { // Don't mind the hidden td
						return;
					}

					var tdNumber = 0;
					if(tds.eq(1).hasClass("name_torrent_1")) { // Keep background-color alternance
						tdNumber = 1;
					}

					if(autogetCol) {
						tds.eq(1).after('<td class="autoget_torrent sti_col_' + tdNumber + '"><a href="#" class="autoget_link"><img src="static/images/rss.gif" /></a></td>');
					}
					if(bookmarkCol) {
						tds.eq(1).after('<td class="bookmark_torrent sti_col_' + tdNumber + '"><a href="#" class="bookmark_link"><img src="' + chrome.extension.getURL("images/bookmark.png") + '" /></a></td>');
					}
					if(nfoCol) {
						tds.eq(1).after('<td class="nfo_torrent sti_col_' + tdNumber + '"><a href="#" class="nfo_link"><img src="' + chrome.extension.getURL("images/nfo.png") +'" /></a></td>');
					}
					if(ageCol) {
						var dateMatch = $(this).next().text().match(/(\d+)\/(\d+)\/(\d+) à (\d+):(\d+)/);
						if(!dateMatch || !dateMatch.length) { // This should never happen
							return;
						}

						// Append our age td
						tds.eq(1).after('<td class="age_torrent sti_col_' + tdNumber + '">' + simpleDateToDiff(dateMatch) + '</td>');
					}
				}
			});

			if(ageCol && !$(".age_torrent_head:first").find("a").length && mOptions.canSort) {
				var sortedUrl = utils.clone(pageUrl);
				sortedUrl.path = "/sphinx.php";
				sortedUrl.params = sortedUrl.params || {};
				sortedUrl.params.page = 0;
				sortedUrl.params.sort = "id";
				sortedUrl.params.order = "desc";
				if(pageUrl.params && pageUrl.params.sort == "id" && pageUrl.params.order != "asc") {
					sortedUrl.params.order = "asc";
				}

				$(".age_torrent_head:first").wrapInner('<a href="' + utils.craftUrl(sortedUrl) + '"></a>');
			}
			dbg("[columns] Ended");
		};

		var autogetOnClick = function() {
			$(this).parents("tr").next().find("a[onclick^=AutoGet]").get(0).click();
			return false;
		};

		var bookmarkOnClick = function() {
			$(this).parents("tr").next().find("a[onclick^=AutoBook]").get(0).click();
			return false;
		};

		var nfoOnClick = function() {
			var a = $(this).parents("tr").find("td:nth(1) a"),
				name = a.text(),
				id = a.attr("href").match(/\d+/)[0],
				html = '<img src="/nfo.php?id=' + id + '" />';
			$("#sti_t_nfo").remove();
			appendFrame({ id: "t_nfo", title: "NFO du torrent" + name, data: html, relativeToWindow: true, top: 20, left: true, css: { maxHeight: 600, width: 920 }, removeOnOutsideClick: true });
			$("#sti_t_nfo").mouseleave(function() {
				$(this).remove();
			});
			return false;
		};

		var autorefreshInterval, isRefreshable = false;
		var startAutorefresh = function() {
			if(!opt.get(module_name, "auto_refresh") || !mOptions.canRefresh || !isRefreshable) {
				return;
			}

			autorefreshInterval = setInterval(function() {
				dbg("[auto_refresh] Grabing this page");
				utils.grabPage(pageUrl, function(data) {
					torrentsTR = $(data).find("#torrent_list tr");
					dbg("[auto_refresh] Got data");
					if(torrentsTR && torrentsTR.length) {
						var firstTorrentId = torrentList[0].id,
							foundFirst = false,
							insertedTrs = false,
							tdNumber = 0;
						$(torrentsTR.get().reverse()).each(function() {
							if(!foundFirst && !$(this).find(".alt1").length && !$(this).hasClass("head_torrent") && Number($(this).find("td:nth(1) img:first").attr("id").substring(10)) >= firstTorrentId) {
								foundFirst = true;
								tdNumber = $(this).find(".name_torrent_1").length ? 1 : 0;
								return;
							}
							if(foundFirst && !$(this).hasClass("head_torrent")) {
								var torrentTR = $(this);
								if(!torrentTR.find(".alt1").length) {
									var torrentNameTd = torrentTR.find("td:nth(1)");
									if(opt.get(module_name, "autoget_column")) {
										torrentNameTd.after('<td class="autoget_torrent sti_col_' + tdNumber + '"><a href="#" class="autoget_link"><img src="static/images/rss.gif" /></a></td>');
									}
									if(opt.get(module_name, "bookmark_column")) {
										torrentNameTd.after('<td class="autoget_torrent sti_col_' + tdNumber + '"><a href="#" class="bookmark_link"><img src="' + chrome.extension.getURL("images/bookmark.png") + '" /></a></td>');
									}
									if(opt.get(module_name, "nfo_column")) {
										torrentNameTd.after('<td class="autoget_torrent sti_col_' + tdNumber + '"><a href="#" class="nfo_link"><img src="' + chrome.extension.getURL("images/nfo.png") + '" /></a></td>');
									}
									if(opt.get(module_name, "age_column")) {
										torrentNameTd.after('<td class="age_torrent sti_col_' + tdNumber + '">frais</td>');
									}
									torrentTR.find("td:nth(1)").css("background-color", opt.get(module_name, "auto_refresh_color"));
								}
								$("#torrent_list tr:first").after(torrentTR);
								$("#torrent_list tr:last").remove();
								insertedTrs = true;
								torrentList.unshift(tagTorrent(torrentTR));
								if(tdNumber == 1) {
									tdNumber = 0;
								}
							}
						});
						if(insertedTrs) {
							dbg("[auto_refresh] Inserted torrents");
							$(document).trigger("endless_scrolling_insertion_done");
						}
						else {
							dbg("[auto_refresh] Nothing new");
						}
						refreshDate();
						recalcAgeColumn();
					}
					else {
						dbg("[auto_refresh] No data");
					}
				});
			}, 60000);
		};

		var findTorrent = function(pageNumber) {
			$("#find_marked_torrent_span").remove();
			var foundMarkedTorrent = false;
			var torrentIdMark = opt.get(module_name, "torrent_marker");
			$("#torrent_list tr:not(:first)").find("td:nth(1) a").each(function() {
				torrentId = Number($(this).attr("href").match(/\/torrent\.php\?id=(\d+)/)[1]);
				if(torrentId <= torrentIdMark) {
					dbg("[TorrentMark] Found it !");
					foundMarkedTorrent = true;
					$(".page_loading").remove();
					$(this).parent().addClass("torrent_mark_found");
					$(document).scrollTop($(this).offset().top - window.innerHeight + 21);
					return false;
				}
			});
			if(!foundMarkedTorrent) {
				var urlFinder = utils.clone(pageUrl);
				urlFinder.path = "/sphinx.php";
				urlFinder.params = pageUrl.params || {};
				urlFinder.params.page = pageNumber;
				dbg("[TorrentMark] Grabbing next page");
				utils.grabPage(urlFinder, function(data) {
					var insertionData = $(data).find("#torrent_list tr");
					if(insertionData.length) {
						dbg("[TorrentMark] Insert torrents");
						$("#torrent_list").append(tagTorrents(insertionData));
						refreshDate();
						addColumns();
						applyFilters();
						dbg("[TorrentMark] Blocking endless scrolling");
						avoidEndlessScrolling = true;
						findTorrent(pageNumber + 1);
					}
				});
			}
		};

		var columns_def = {
			1: "normal",
			3: "coms",
			4: "size",
			5: "complets",
			6: "seeders",
			7: "leechers"
		};
		var columnSorter = function() {
			if(!mOptions.canSort) {
				return;
			}

			var sortedUrl = utils.clone(pageUrl);
			sortedUrl.path = "/sphinx.php";
			sortedUrl.params = sortedUrl.params || {};
			sortedUrl.params.page = 0;

			$(".head_torrent:first td").each(function(k, td) {
				if(columns_def[k]) {
					sortedUrl.params.sort = columns_def[k];
					sortedUrl.params.order = "desc";
					if(pageUrl.params && pageUrl.params.sort == columns_def[k] && pageUrl.params.order != "asc") {
						sortedUrl.params.order = "asc";
					}

					$(this).wrapInner('<a href="' + utils.craftUrl(sortedUrl) + '"></a>');
				}
			});
		};

		var onTorrentCommentsMouseover = function() {
			showTorrentComments($(this));
		}

		var showTorrentComments = function(commLink) {
			if(opt.get(module_name, "direct_comments") && commLink.attr("href").match(/\/com.php/) && commLink.text() != "0") {
				utils.grabPage(commLink.attr("href"), function(data) {
					$("#sti_t_comm").remove();

					var $content = $(data.replace(/<script type="text\/javascript" src="static\/js\/.*"><\/script>/g, '')).find("#contenu").children(),
						$com = $content.filter("#com"),
						autoSubmit = false;
					$com.find("#compreview").on("submit", function(e) {
						e.preventDefault();
						dbg("[t_comment] Preview clicked");
						var log = $content.find("#log_res").empty().addClass('ajax-loading'),
							$form = $(this);
						$.ajax({
							method: $form.attr("method"), 
							url: $form.attr("action"), 
							data: $form.serialize(),
							success: function(res) {
								log.removeClass('ajax-loading');
								var $formDiv = $(res),
									$form2 = $formDiv.find("form");
								$form2.on("submit", function(e2) {
									dbg("[t_comment] Send clicked");
									e2.preventDefault();
									$.ajax({
										method: $form2.attr("method"),
										url: $form2.attr("action"),
										data: $form2.serialize(),
										success: function(res2) {
											$("#sti_t_comm").remove();
											showTorrentComments(commLink);
										}
									});
								})

								if(autoSubmit) {
									$form2.submit();
								}
								else {
									log.append($formDiv);
								}
							}
						});
					})
					var sendBtn = $("<input>", {type: "button", class: "fine", value: " Valider votre commentaire "}).click(function() {
						dbg("[t_comment] Direct send clicked");
						autoSubmit = true;
						$com.find("#compreview").submit();
					});
					$com.find("#submitter").after(sendBtn);

					// { id, classes, title, header, data, relativeToId, relativeToObj, relativeToWindow, top, left, css, buttons = [ /* close is by default */ { b_id, b_text, b_callback} ], underButtonsText }
					appendFrame({ id: "t_comm", title: "Commentaires pour le torrent " + commLink.attr("href").match(/\d+/)[0], data: $content, relativeToWindow: true, top: 20, left: true, css: { minWidth: 500, maxWidth: 780, maxHeight: 600 }, removeOnOutsideClick: true });
					//$("#sti_t_comm").find("#sti_t_comm_data p, #sti_t_comm_data #com").remove();
					$("#sti_t_comm_data #com").hide();
					$("#sti_t_comm_data p:first").click(function() {
						$("#sti_t_comm_data #com").slideToggle();
					});
					$("#sti_t_comm").mouseleave(function() {
						$(this).remove();
					});
				});
			}
		};

		var mark_first_torrent = function() {
			if(torrentList.length > 0) {
				dbg("[TorrentMark] Marking torrent [" + torrentList[0].id + "]");
				opt.set(module_name, "torrent_marker", torrentList[0].id);
				$("#torrent_marker_button").remove();
			}
			return false;
		};

		var find_marked_torrent = function() {
			dbg("[TorrentMark] Looking for torrent mark");
			$("#torrent_list").before('<p class="pager_align page_loading"><img src="' + chrome.extension.getURL("images/loading.gif") + '" /><br />Désencapsulation des torrents à la recherche du marqueur</p>');
			findTorrent(1);
			$("#torrent_finder_button").remove();
			return false;
		};

		var MAX_WIDTH = 300, MIN_HEIGHT = 154, WANTED_HEIGHT = 317;
		var whitelistUrls = ["thetvdb.com", "allocine.fr", "tvrage.com", "betaseries.com"];
		var previewTorrent = function(e) {
			if(!opt.get(module_name, "preview")) {
				return;
			}
			var torrentId = $(this).attr("id").substring(10);

			if(e.type == "mouseleave") {
				dbg("[preview] Remove");
				$("#sti_preview_" + torrentId).remove();
			}
			else {
				var pos = $(this).offset();
				$("#global").after('<div id="sti_preview_' + torrentId + '" class="sti_preview"><img src="' + chrome.extension.getURL("images/loading.gif") + '" /></div>');
				$("#sti_preview_" + torrentId).offset({top: pos.top - 6, left: pos.left - 38});
				dbg("[preview] Fetch torrent info");
				utils.grabPage("/torrent.php?id=" + torrentId + "", function(data) {
					var previewDiv = $("#sti_preview_" + torrentId);
					if(!previewDiv.length) {
						dbg("[preview] Abort !");
						return;
					}

					var imgs = [];
					$(data).find("#torrent fieldset img").each(function() {
						imgs.push($(this).attr("src"));
					});
					$(data).find("#summary img").each(function() {
						imgs.push($(this).attr("src"));
					});
					if(!imgs.length) {
						$(data).find("#torrent div.bbcenter img").each(function() {
							imgs.push($(this).attr("src"));
						});
					}

					if(!imgs.length) {
						previewDiv.remove();
						return;
					}

					dbg("[preview] Got torrent info with some imgs");
					var img = new Image(), i = 0, maybeSrc = false, forceSmall = false;
					img.onload = function() {
						for(var url in whitelistUrls) {
							if(this.src.indexOf(whitelistUrls[url]) != -1) { forceSmall = true; }
						}
						if(this.height <= MIN_HEIGHT && ++i < imgs.length) {
							dbg("[preview] Too small");
							this.src = imgs[i];
						}
						else if(this.height > MIN_HEIGHT && this.height <= WANTED_HEIGHT && !forceSmall) {
							dbg("[preview] Meh :: size [%d x %d] Keep it, it may be useful", this.width, this.height);
							maybeSrc = this.src;
							if(++i < imgs.length) {
								this.src = imgs[i];
							}
							else {
								dbg("[preview] No images left, fallback");
								forceSmall = true;
								this.onload();
							}
						}
						else if(this.height > WANTED_HEIGHT || forceSmall) {
							dbg("[preview] Perfect :: size [%d x %d]", this.width, this.height);
							var top = pos.top, scrollTop = (document.body.scrollTop || document.documentElement.scrollTop), windowHeight = $(window).height(), resizedHeight = (this.width > 300 ? this.height * (300 / this.width) : this.height);
							if(top + resizedHeight + 4 > scrollTop + windowHeight) {
								top = (scrollTop + windowHeight) - resizedHeight - 4;
							}
							previewDiv.offset({ top: top, left: pos.left - 6 - Math.min(this.width, MAX_WIDTH) });
							$("#sti_preview_" + torrentId + " img").attr("src", this.src);
						}
						else if(maybeSrc) {
							dbg("[preview] Ok, backup to maybeSrc");
							forceSmall = true;
							this.src = maybeSrc;
						}
						else {
							dbg("[preview] Nothing was big enough");
							previewDiv.remove();
						}
					};
					img.src = imgs[i];
				});
			}
		};

		var siteRelativeDate = utils.getSiteRelativeDate();
		var refreshDate = function() {
			siteRelativeDate = utils.getSiteRelativeDate();
		};

		var markerButton =  '<a id="torrent_marker_button" href="#">Marquer torrent</a> |';
		var finderButton = '<a id="torrent_finder_button" href="#">Retrouver torrent</a> | ';
		var filterButtons = '<span class="g_filter g_filter_' + opt.get(module_name, "filter_freeleech") + '" opt="filter_freeleech">FreeLeech</span> | <span class="g_filter g_filter_' + opt.get(module_name, "filter_nuked") + '" opt="filter_nuked">Nuked</span> |';
		var stringFilterInput = '<input type="text" id="filter_string" placeholder="Filtre" size="12" title="Options de filtrage\nComplétés : c<10\nSeeders : s=1\nLeechers : l>12\nCommentaires : m>0\nChaine de caractères\nOpérateurs : && || !\n\nExemples :\nDVDRiP ou BDRiP avec +10 seeders\n\'dvdrip || bdrip && s>10\'\n\nExclure FUNKY et CARPEDIEM\n\'!funky && !carpediem\'" />| ';
		var refreshButton = '<input id="auto_refresh" type="checkbox" ' + (opt.get(module_name, "auto_refresh") ? 'checked="checked" ' : ' ') + '/><label for="auto_refresh">Auto refresh</label> | ';
		var buttons = "";

		dbg("[Init] Starting");

		// Adding buttons
		if(mOptions.canMark && (!pageUrl.params || !pageUrl.params.page || pageUrl.params.page === 0) && (!pageUrl.params || !pageUrl.params.sort || (pageUrl.params.sort == "id" && (!pageUrl.params.order || pageUrl.params.order == "desc"))) && opt.get(module_name, "t_marker_button")) {
			var torrentIdMark = opt.get(module_name, "torrent_marker");
			var firstTorrentId = Number($("tbody tr:nth(1) td:nth(1) a").attr("href").match(/\/torrent.php\?id=(\d+)/)[1]);
			if(torrentIdMark !== false && firstTorrentId - torrentIdMark < 2000) {
				buttons += finderButton;
			}
			buttons += markerButton;
		}
		if(!pageUrl.params || !pageUrl.params.sort || (pageUrl.params.sort == "id" && pageUrl.params.order == "desc")) { isRefreshable = true; }
		if(mOptions.canRefresh && isRefreshable) {
			buttons += refreshButton;
		}
		if(mOptions.canFilter) {
			buttons += filterButtons;
			if(opt.get(module_name, "filter_string")) {
				buttons += stringFilterInput;
			}
		}

		if(mOptions.buttonsAppend) {
			$(mOptions.buttons).append(buttons);
		}
		else {
			$(mOptions.buttons).prepend(buttons);
		}
		$("#torrent_marker_button").click(mark_first_torrent);
		$("#torrent_finder_button").click(find_marked_torrent);

		// Torrents filtering
		$(".g_filter").click(function() {
			var button = $(this);
			var optName = button.attr("opt");
			var optStatus = opt.get(module_name, optName);
			button.removeClass("g_filter_" + optStatus);
			optStatus = ++optStatus > 2 ? 0 : optStatus;
			opt.set(module_name, optName, optStatus);
			dbg("[Filters] %s is %s", optName, opt.get(module_name, optName));
			button.addClass("g_filter_" + optStatus);
			filtersChanged();
		});

		$("#filter_string").on("change", filtersChanged).on("keydown", function(e) {
			if(e.which == 13) { e.preventDefault(); }
		}).on("keyup", function(e) {
			if(e.which == 13) { filtersChanged(); }
		});

		$("#auto_refresh").change(function() {
			opt.set(module_name, "auto_refresh", $(this).prop("checked"));
			dbg("[auto_refresh] is %s", opt.get(module_name, "auto_refresh"));
			if(opt.get(module_name, "auto_refresh")) {
				dbg("[auto_refresh] Starting");
				startAutorefresh();
			}
			else {
				dbg("[auto_refresh] Ended");
				clearInterval(autorefreshInterval);
			}
		});
		tagTorrents($("tbody tr"));
		filtersChanged();
		columnSorter();
		initColumns();
		addColumns();

		$("#torrent_list").on("mouseenter", "a", onTorrentCommentsMouseover)
			.on("click", "a.autoget_link", autogetOnClick)
			.on("click", "a.bookmark_link", bookmarkOnClick)
			.on("click", "a.nfo_link", nfoOnClick)
			.on("mouseenter mouseleave", 'img[alt="+"]', previewTorrent);

		startAutorefresh();

		$(document).on("endless_scrolling_insertion_done", function() {
			dbg("[endless_scrolling] Module specific functions");
			$("#find_marked_torrent_span").remove();
			refreshDate();
			addColumns();
			applyFilters();
			$(document).trigger("es_dom_process_done");
		});

		dbg("[Init] Ready");
	}
};