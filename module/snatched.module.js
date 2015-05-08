modules.snatched = {
	name: "snatched",
	dText: "Snatched",
	pages: [
		{ path_name: "/my.php", pamams: { snatched: true }, options: { buttons: '#contenu div:first', loading: '.pager_align' } }
	],
	loaded: false,
	loadModule: function(mOptions) {
		this.loaded = true;
		var module_name = this.name;
		var dbg = function() {
			utils.dbg(module_name, arguments);
		};

		dbg("[Init] Loading module");

		var torrentList = [];
		var tagTorrents = function(torrentLines) {
			dbg("[TorrentTag] Scanning");
			$(torrentLines).each(function() {
				var node = $(this);
				var t = {node: node, status: {}, shown: true};
				node.find("td").each(function(i) {
					// 1: Get .. 2: UL .. 3: DL .. 4: Ratio .. 5: ST .. 6: LT .. 7: CompletionDate .. 8: Seeding .. 9: Completed .. 10: HnR
					if(i === 0) {
						t.name = $(this).text();
						if(t.name == "Torrent Supprimé") {
							t.name = null;
							t.status.deleted = true;
						}
					}
					else if(i == 2) {
						t.ul = utils.strToSize($(this).text()).oTot;
					}
					else if(i == 3) {
						t.dl = utils.strToSize($(this).text()).oTot;
					}
					else if(i == 4) {
						t.ratio = Number($(this).text());
					}
					/*else if(i == 5) {
						t.st;
					}
					else if(i == 6) {
						t.lt;
					}
					else if(i == 7) {
						t.cdate;
					}*/
					else if(i == 8) {
						t.status.seeding = $(this).find("img[alt=Oui]").length > 0;
					}
					else if(i == 9) {
						t.status.completed = $(this).find("img[alt=Oui]").length > 0;
					}
					else if(i == 10) {
						t.status.hnr = $(this).text() != "Non";
					}
				});
				node.data("t", t);
				torrentList.push(t);
			});
			dbg("[TorrentTag] Ended scanning");
			return torrentLines;
		};
		modules.endless_scrolling.preInsertion = tagTorrents;

		var filtersChanged = function() {
			refreshFilterSet();
			applyFilters();
		};

		var basicFilters = {deleted: 2, seeding: 0, completed: 0, hnr: 0};
		var refreshFilterSet = function() {
			basicFilters = {deleted: opt.get(module_name, "filter_deleted"), seeding: opt.get(module_name, "filter_seed"), completed: opt.get(module_name, "filter_complete"), hnr:opt.get(module_name, "filter_hnr") };
		};

		var applyFilters = function() {
			var showTorrents = [];
			var hideTorrents = [];
			$.each(torrentList, function(i, t) {
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

		var sortColumnClick = function() {
			if(sort == $(this).attr("id")) {
				order = (order == "desc" ? "asc" : "desc");
			}
			else {
				sort = $(this).attr("id");
				order = "asc";
			}
			sortData();
			return false;
		};

		var order = "desc", sort = "sortDate", sortFunc;
		var sortData = function() {
			if(!sort) {
				return;
			}

			sortFunc = false;
			switch(sort) {
				case "sortName":
					sortFunc = function(a, b) {
						var aN = $(a).data("t").name;
						var bN = $(b).data("t").name;
						return order == "desc" ? (aN > bN ? -1 : 1) : (aN > bN ? 1 : -1);
					};
					break;
				case "sortUL":
					sortFunc = function(a, b) {
						var aN = $(a).data("t").ul;
						var bN = $(b).data("t").ul;
						return order == "desc" ? (aN > bN ? -1 : 1) : (aN > bN ? 1 : -1);
					};
					break;
				case "sortDL":
					sortFunc = function(a, b) {
						var aN = $(a).data("t").dl;
						var bN = $(b).data("t").dl;
						return order == "desc" ? (aN > bN ? -1 : 1) : (aN > bN ? 1 : -1);
					};
					break;
				case "sortRatio":
					sortFunc = function(a, b) {
						var aN = $(a).data("t").ratio;
						var bN = $(b).data("t").ratio;
						return order == "desc" ? (aN > bN ? -1 : 1) : (aN > bN ? 1 : -1);
					};
					break;
				case "sortActive":
					sortFunc = function(a, b) {
						var aN = $(a).data("t").seeding;
						var bN = $(b).data("t").seeding;
						return order == "desc" ? (aN > bN ? 1 : -1) : (aN > bN ? -1 : 1);
					};
					break;
				case "sortCompleted":
					sortFunc = function(a, b) {
						var aN = $(a).data("t").seeding;
						var bN = $(b).data("t").seeding;
						return order == "desc" ? (aN > bN ? 1 : -1) : (aN > bN ? -1 : 1);
					};
					break;
				case "sortHnR":
					sortFunc = function(a, b) {
						var aN = $(a).data("t").seeding;
						var bN = $(b).data("t").seeding;
						return order == "desc" ? (aN > bN ? 1 : -1) : (aN > bN ? -1 : 1);
					};
					break;
			}
			updateSorter();
		};

		var updateSorter = function() {
			if (sortFunc) {
				$("#table_snatchlist tr:not(:first)").detach().sort(sortFunc).appendTo($("#table_snatchlist"));
			}
		}

		var maxPage = modules["endless_scrolling"].maxPage, thisPage = modules["endless_scrolling"].thisPage;
		var canGrabAllPages = (!pageUrl.params || pageUrl.params.page === 0);
		var grabAllPages = function() {
			loadingPage = true;

			dbg("[AllPagesGrab] Loading all pages");
			var nextUrl = utils.clone(pageUrl);
			nextUrl.cancelQ = true;
			nextUrl.params = nextUrl.params ? nextUrl.params : {};

			if(thisPage == maxPage) {
				dbg("[AllPagesGrab] Not enough pages");
				return;
			}

			dbg("[AllPagesGrab] Grabbing started");
			$(mOptions.loading).before('<p class="pager_align page_loading"><img src="' + chrome.extension.getURL("images/loading.gif") + '" /><br />Hachage positronique de l\'ensemble des pages</p>');
			for(var i = 1; i <= maxPage; i++) {
				nextUrl.params.page = i;
				dbg("[AllPagesGrab] Grabbing page %d", i);
				var pageLoaded = 0;
				utils.grabPage(nextUrl, function(data) {
					torrentsTR = $(data).find("#table_snatchlist tr:not(:first)");
					if(torrentsTR && torrentsTR.length) {
						dbg("[AllPagesGrab] Got data - Inserting");
						$("#table_snatchlist").append(tagTorrents(torrentsTR));
					}
					else {
						dbg("[AllPagesGrab] No more data");
						$(".page_loading").text("Plus rien en vue cap'tain !");
					}
					pageLoaded++;
					if(pageLoaded == maxPage) {
						$(".page_loading").remove();
						dbg("[AllPagesGrab] Grabbing ended");
						updateSorter();
						applyFilters();
						$(document).trigger("es_dom_process_done");
					}
				});
			}
			dbg("[AllPagesGrab] Stop endless scrolling");
			$("#grabAllPagesSpan").remove();
			stopEndlessScrolling = true;
			return false;
		};

		dbg("[Init] Starting");
		// Adding buttons
		var torrentButtons = ' | <span class="g_filter g_filter_' + opt.get(module_name, "filter_deleted") + '" opt="filter_deleted">Supprimés</span> | <span class="g_filter g_filter_' + opt.get(module_name, "filter_seed") + '" opt="filter_seed">En seed</span> | <span class="g_filter g_filter_' + opt.get(module_name, "filter_complete") + '" opt="filter_complete">Completés</span> | <span class="g_filter g_filter_' + opt.get(module_name, "filter_hnr") + '" opt="filter_hnr">Hit&Run</span>' + (canGrabAllPages ? '<span id="grabAllPagesSpan"> | <a href="#" id="grabAllPages">Récupérer toutes les pages</a></span>' : '');

		$(mOptions.buttons).append(torrentButtons);

		var colSortButtons = [ "sortName", false, "sortUL", "sortDL", "sortRatio", false, false, false, "sortActive", "sortCompleted", "sortHnR" ];
		$("#table_snatchlist tr:first td").each(function(i) {
			if(colSortButtons[i]) {
				$(this).wrapInner('<a id="' + colSortButtons[i] + '" class="sortCol" href="#">');
			}
		});

		// No reason to show grabber if not on first page
		if(canGrabAllPages) {
			$("#grabAllPages").click(grabAllPages);
		}

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
			$(document).trigger("es_dom_process_done");
		});

		tagTorrents($("#table_snatchlist tr:not(:first)"));
		filtersChanged();
		$(".sortCol").click(sortColumnClick);

		$(document).on("endless_scrolling_insertion_done", function() {
			dbg("[endless_scrolling] Module specific functions");
			updateSorter();
			applyFilters();
			canGrabAllPages = false;
			$("#grabAllPagesSpan").remove();
			$(document).trigger("es_dom_process_done");
		});

		dbg("[Init] Ready");
	}
};
