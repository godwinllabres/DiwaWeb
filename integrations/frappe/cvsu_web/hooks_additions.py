# =============================================================================
# Sevi chat widget — additions for cvsu_web/cvsu_web/hooks.py
# Merge these lines into your existing hooks.py (don't create a second file).
# =============================================================================

# Internal staff only — loads on the logged-in Desk (/app/*), never for
# anonymous visitors. This is the right hook for an internal employee assistant.
app_include_js = ["/assets/cvsu_web/js/sevi_widget.js"]

# If you ALSO want Sevi on the public website + student portal, uncomment:
# web_include_js = ["/assets/cvsu_web/js/sevi_widget.js"]

# NOTE ON APP NAME: `bench new-app cvsu-web` creates the Python module
# `cvsu_web` (hyphen -> underscore). All asset paths use the underscore form:
#   /assets/cvsu_web/js/...
