ace.define("ace/snippets/pulpscript",["require","exports","module"],function(e,t,n){"use strict";t.snippetText='snippet on\n	on ${1:event} do\n		${2:// ...}\n	end\nsnippet while\n	while ${1:condition} do\n		${2:// ...}\n	end\nsnippet if\n	if ${1:condition} then\n		${2:// ...}\n	end\nsnippet elseif\n	elseif ${1:condition} then\n		${2:// ...}\nsnippet wait\n	wait ${1:seconds} then\n		${2:// ...}\n	end\nsnippet tell\n	tell ${1:target} to\n		${2:// ...}\n	end\nsnippet say\n	say "${1:...}"\nsnippet log\n	log "${1:...}"\nsnippet ask\n	ask "${1:...}" then\n		option "${2:...}" then\n			${3:// ...}\n		end\n	end\nsnippet option\n	option "${1:...}" then\n		${2:// ...}\n	end\nsnippet menu\n	menu at ${1:rect} then\n		option "${2:...}" then\n			${3:// ...}\n		end\n	end',t.scope="pulpscript"});                (function() {
                    ace.require(["ace/snippets/pulpscript"], function(m) {
                        if (typeof module == "object" && typeof exports == "object" && module) {
                            module.exports = m;
                        }
                    });
                })();
            