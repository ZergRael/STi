modules.torrent = {
	name: "torrent",
	dText: "Fiche torrent",
	pages: [
		{ path_name: "/torrent.php", options: { loading: '#torrent_comments p:last' } }
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

		var torrentId = pageUrl.params.id;

		var appendQuickComment = function() {
			if(!$(mOptions.loading).find('a').length && !$("#com").length) {
				return;
			}
			if(!opt.get(module_name, "quick_comment")) {
				return;
			}
			$("#quickpost").remove();
			$("#com").remove();

			dbg("[QuickComment] Grabbing quickcomment textarea");
			$(mOptions.loading).hide();
			$(mOptions.loading).after('<p class="pager_align page_loading"><img src="' + chrome.extension.getURL("images/loading.gif") + '" /><br />Protonisation des entrailles du quick comment</p>');
			var urlQuickComment = { host: pageUrl.host, path: "/com.php", params: { id: torrentId } };

			utils.grabPage(urlQuickComment, function(data) {
				$(".page_loading").remove();
				var $com = $(data).find("#com"),
					autoSubmit = false;
				$com.find("#compreview").on("submit", function(e) {
					e.preventDefault();
					var log = $("#log_res").empty().addClass('ajax-loading'),
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
								e2.preventDefault();
								$.ajax({
									method: $form2.attr("method"),
									url: $form2.attr("action"),
									data: $form2.serialize(),
									success: function(res2) {
										appendQuickComment();
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
					autoSubmit = true;
					$com.find("#compreview").submit();
				})
				$com.find("#submitter").after(sendBtn);
				$(mOptions.loading).after($com);
				$(document).trigger("reactivate_keydown_listenner");
				dbg("[QuickComment] Quickcomment ready");
			});
		};

		var addBookmarkStar = function() {
			var bookmarkedTorrents = gData.get("bookmarks", "torrents");
			if(bookmarkedTorrents.indexOf(torrentId) != -1) {
				$("#contenu .separate:first").prepend('<img src="' + chrome.extension.getURL("images/bookmark.png") + '" />');
			}
		};

		dbg("[Init] Starting");
		// Execute functions

		opt.setCallback(module_name, "quick_comment", function(state) {
			quick_comment = state;

			if(quick_comment) {
				appendQuickComment();
			}
			else {
				$("#com").remove();
				$(mOptions.loading).show();
			}
		});

		appendQuickComment();
		addBookmarkStar();

		dbg("[Init] Ready");
	}
};