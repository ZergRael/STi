modules.forums = {
	name: "forums",
	dText: "Forums",
	pages: [
		{ path_name: "/forums.php", params: { action: 'viewtopic' }, options: { buttons: '.linkbox:first' } },
		{ path_name: "/forums.php", params: { action: "editpost", postid: "*"} }
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

		var addSignatureToggler = function() {
			if(!opt.get(module_name, "hidable_sigs")) {
				return;
			}

			dbg("[signatureToggler] Added");
			$(document).on("click", "p.sig_separator", function() {
				dbg("[signatureToggler] Clicked");
				$(this).next(".usersignature").toggle();
			});
		};

		var hideSignatures = function() {
			if(!opt.get(module_name, "hide_signatures")) {
				return;
			}

			$(".usersignature").hide();
		}

		var addEditionListener = function() {
			if(!opt.get(module_name, "edit_inplace")) {
				return;
			}

			$(document).on("click", "a[href^='forums.php?action=editpost']", function(e) {
				e.preventDefault();

				var $post = $(this).parents(".forum_user_message"),
					postId = $post.find("a:first").text().match(/\d+/)[0];

				utils.grabPage({ host: pageUrl.host, path: pageUrl.path, params: {action: "editpost", postid: postId }}, function(data) {
					var $form = $(data).find("#contenu form");
					$post.find(".comment").html($form);
					$form.find("textarea").on("focusin", function() {
						$form.attr("name", "form");
					}).focus().on("focusout", function() {
						$form.attr("name", "Form");
					});
					$(document).trigger("reactivate_keydown_listenner");
				});
			});
		}

		var fixEditBBSmilies = function() {
			$("#contenu form").attr("name", "form");
		}

		dbg("[Init] Starting");
		// Execute functions

		if(pageUrl.params.action == "viewtopic") {
			addSignatureToggler();
			hideSignatures();
			addEditionListener();

			$(document).on("endless_scrolling_insertion_done", function() {
				dbg("[endless_scrolling] Module specific functions");
				$(document).trigger("recolor_twits");
				hideSignatures();
				$(document).trigger("es_dom_process_done");
			});
		}
		else {
			fixEditBBSmilies();
		}
		
		dbg("[Init] Ready");
	}
};