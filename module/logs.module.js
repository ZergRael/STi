modules.logs = {
	name: "logs",
	pages: [
		{ path_name: "/logs.php", options: { buttons: '#head_notice_left', auto_refresh_interval: 60000 } }
	],
	loaded: false,
	loadModule: function(mOptions) {
		this.loaded = true;
		var module_name = this.name;
		var dbg = function() {
			utils.dbg(module_name, arguments);
		};

		dbg("[Init] Loading module");
		// Loading all functions used

		var refreshTimer = false;
		var autoRefresh = function() {
			if(pageUrl.params && pageUrl.params.page != "0") {
				dbg("[auto_refresh] Not first page");
				return;
			}

			refreshTimer = setInterval(function() {
				dbg("[auto_refresh] Grabing this page");
				utils.grabPage(pageUrl, function(data) {
					logsTR = $(data).find("tbody tr");
					dbg("[auto_refresh] Got data");
					if(logsTR && logsTR.length) {
						var firstTR = $("tbody tr:nth(1)");
						var foundFirst = false;
						$(logsTR.get().reverse()).each(function() {
							if($(this).text() == firstTR.text()) {
								foundFirst = true;
								return;
							}
							if(foundFirst && !$(this).find(".date_head").length) {
								$("tbody tr:first").after($(this));
								$("tbody tr:last").remove();
							}
						});
						refreshFilters(true);
						forceIdLinks();
					}
					else {
						dbg("[auto_refresh] No data");
					}
				});
			}, mOptions.auto_refresh_interval);
		};

		var filtersArray = {
			"uploads_filter":      { className: "log_upload" },
			"delete_filter":       { className: "log_upload_delete" },
			"edit_filter":         { className: "log_upload_edit" },
			"request_filter":      { className: "log_requests_new" },
			"request_fill_filter": { className: "log_requests_filled" },
			"summary_edit_filter": { className: "log_summary_edit" },
			"summary_new_filter":  { className: "log_summary_new" }
		};

		var initFilters = function() {
			$.each(filtersArray, function(filter, filterData) {
				filterData.show = !opt.get(module_name, filter);
				filterData.lastStatus = filterData.show;
			});
		};

		var refreshFilters = function(notAnInput) {
			dbg("[*_filter] Refresh");
			$.each(filtersArray, function(filter, filterData) {
				filterData.show = !opt.get(module_name, filter);
				if(notAnInput || filterData.show != filterData.lastStatus) {
					if(filterData.show) {
						$("#log_list span." + filterData.className).parents("tr").show();
					}
					else {
						$("#log_list span." + filterData.className).parents("tr").hide();
					}
					filterData.lastStatus = filterData.show;
				}
			});
			dbg("[*_filter] Done");
			$(document).trigger("es_dom_process_done");
		};

		var forceIdLinks = function() {
			dbg("[id_links] Refresh");
			$(".log_upload, .log_upload_edit").each(function() {
				$(this).html($(this).html().replace(/Torrent (\d+)/, 'Torrent <a href="/torrent.php?id=$1">$1</a>'));
			});
			$(".log_summary_new, .log_summary_edit").each(function() {
				$(this).html($(this).html().replace(/Summary (\d+)/, 'Summary <a href="/summary.php?id=$1">$1</a>'));
			});
			$(".log_requests_new").each(function() {
				$(this).html($(this).html().replace(/Requests : ([^<]+)/, 'Request : <a href="/req.php?q=$1">$1</a>'));
			});
			$(".log_requests_filled").each(function() {
				$(this).html($(this).html().replace(/Requests ([^<]+) filled./, 'Request <a href="/req.php?q=$1">$1</a> filled.'));
			});
			dbg("[id_links] Done");
		};

		var updateBottomText = function() {
			var bottomP = $("#contenu p:last");
			if(!$("#filtered_text").length) {
				bottomP.html(bottomP.html().trim());
				bottomP.append('<span id="filtered_text"></span>');
				dbg("[bottomText] Ready");
			}
			$("#filtered_text").text(", " + ($("tbody tr:visible").length - 1) + " après filtrage.");
			dbg("[bottomText] Updated");
		};

		dbg("[Init] Starting");
		// Execute functions

		var buttons = [
			'<span id="uploads_filter" class="g_state_button g_filter g_state_' + (opt.get(module_name, "uploads_filter") ? "2" : "0") + '">Uploads</span>',
			'<span id="delete_filter" class="g_state_button g_filter g_state_' + (opt.get(module_name, "delete_filter") ? "2" : "0") + '">Delete</span>',
			'<span id="edit_filter" class="g_state_button g_filter g_state_' + (opt.get(module_name, "edit_filter") ? "2" : "0") + '">Edits</span>',
			'<span id="request_filter" class="g_state_button g_filter g_state_' + (opt.get(module_name, "request_filter") ? "2" : "0") + '">Requests</span>',
			'<span id="request_fill_filter" class="g_state_button g_filter g_state_' + (opt.get(module_name, "request_fill_filter") ? "2" : "0") + '">Requests filled</span>',
			'<span id="summary_edit_filter" class="g_state_button g_filter g_state_' + (opt.get(module_name, "summary_edit_filter") ? "2" : "0") + '">Summary edit</span>',
			'<span id="summary_new_filter" class="g_state_button g_filter g_state_' + (opt.get(module_name, "summary_new_filter") ? "2" : "0") + '">Summary new</span>',
			'<span id="auto_refresh" class="g_state_button g_button g_state_' + Number(opt.get(module_name, "auto_refresh")) + '">Auto refresh</span>',
		];
		$(mOptions.buttons).prepend(buttons.join(" "));

		$(".g_state_button").click(function() {
			var $button = $(this),
				optName = $button.attr("id"),
				optState = opt.get(module_name, optName);

			if($button.hasClass("g_filter")) {
				$button.removeClass("g_state_" + (optState ? "2" : "0"));
				optState = !optState;
				opt.set(module_name, optName, optState);
				refreshFilters();
				$(document).trigger("scroll");
				if(pageUrl.params && pageUrl.params.q) {
					updateBottomText();
				}
				$button.addClass("g_state_" + (optState ? "2" : "0"));
			}
			else {
				$button.removeClass("g_state_" + Number(optState));
				optState = !optState;
				opt.set(module_name, optName, optState);
				if(optName == "auto_refresh") {
					dbg("[auto_refresh] is %s", opt.get(module_name, "auto_refresh"));
					if(optState) {
						autoRefresh();
					}
					else {
						clearInterval(refreshTimer);
					}
				}
				$button.addClass("g_state_" + Number(optState));
			}
		});

		if(opt.get(module_name, "auto_refresh")) {
			dbg("[auto_refresh] Starting");
			autoRefresh();
		}

		$(document).on("endless_scrolling_insertion_done", function() {
			dbg("[endless_scrolling] Module specific functions");
			refreshFilters(true);
			forceIdLinks();
			$(document).trigger("scroll");
		});

		initFilters();
		refreshFilters(true);
		forceIdLinks();

		if(pageUrl.params && pageUrl.params.q) {
			updateBottomText();
		}

		dbg("[Init] Ready");
	}
};