/*
  Copyright 2012 Christopher Hoobin. All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are
  met:

  1. Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.

  2. Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the following
  disclaimer in the documentation and/or other materials provided
  with the distribution.

  THIS SOFTWARE IS PROVIDED BY CHRISTOPHER HOOBIN ''AS IS'' AND ANY
  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL CHRISTOPHER HOOBIN OR
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

  The views and conclusions contained in the software and documentation
  are those of the authors and should not be interpreted as representing
  official policies, either expressed or implied, of Christopher Hoobin.
*/

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Cmis.io = {
    save: function(window, source, target) {
        let privacy_context = window
            .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
            .getInterface(Components.interfaces.nsIWebNavigation)
            .QueryInterface(Components.interfaces.nsILoadContext);

        let isPrivate = privacy_context.usePrivateBrowsing;

        let filename = target.leafName;

        if (Services.vc.compare(Services.appinfo.platformVersion, "26.0a1") < 0) {
            // https://developer.mozilla.org/en/nsIWebBrowserPersist
            let persist = Components
                .classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                .createInstance(Components.interfaces.nsIWebBrowserPersist);

            const nsIWebBrowserPersist = Components.interfaces.nsIWebBrowserPersist;

            persist.persistFlags =
                nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
                nsIWebBrowserPersist.PERSIST_FLAGS_FROM_CACHE |
                nsIWebBrowserPersist.PERSIST_FLAGS_CLEANUP_ON_FAILURE;

            const nsIDownloadManager = Components.interfaces.nsIDownloadManager;

            target = NetUtil.newURI(target);

            // https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsIDownloadManager
            let manager = Components
                .classes["@mozilla.org/download-manager;1"]
                .getService(nsIDownloadManager);

            let listener = manager.addDownload(
                nsIDownloadManager.DOWNLOAD_TYPE_DOWNLOAD,
                source,
                target,
                filename,
                null, // mime info
                null, // start time
                null, // tmp file
                persist,
                isPrivate);

            persist.progressListener = listener;

            persist.saveURI(source, null, null, null, null, target, privacy_context);
        }
        else {
            // https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Downloads.jsm
            const {Downloads} = Components.utils.import("resource://gre/modules/Downloads.jsm", {});

            Downloads.createDownload({
                source: source,
                target: target,
            }).then(function (download) {
                download.start();
                let list = Downloads.PUBLIC;
                if (isPrivate) list = Downloads.PRIVATE;
                Downloads.getList(list).then(function (list) {
                    list.add(download);
                });
            }).then(null, Components.utils.reportError);
        }

        let notify = Cmis.preferences.value("statusbarNotification");

        if (notify) {
            if (window && window.XULBrowserWindow) {
                let bundle = Cmis.utility.stringBundle();

                let message = filename + " " + bundle.GetStringFromName("saved");

                window.XULBrowserWindow.setOverLink(message, null);

                Services.strings.flushBundles();
            }
        }
    }
};
