/*
Copyright 2012 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eric Bidelman (ericbidelman@chromium.org)
function errorHandler(e)
function readAsText(fileEntry, callback)
function writeFileEntry(writableEntry, opt_blob, callback)
function waitForIO(writer, callback)

*/
google_file_utils = (function () {
  function errorHandler(e) {
    console.error(e);
  }

  function readAsText(fileEntry, callback) {
    fileEntry.file(function(file) {
      var reader = new FileReader();

      reader.onerror = errorHandler;
      reader.onload = function(e) {
        callback(e.target.result);
      };

      reader.readAsText(file);
    });
  }

  function writeFileEntry(writableEntry, opt_blob, callback) {
    if (!writableEntry) {
      output.textContent = 'Nothing selected.';
      return;
    }
    writableEntry.createWriter(function(writer) {
      writer.onerror = errorHandler;
      writer.onwriteend = callback;
      // If we have data, write it to the file. Otherwise, just use the file we
      // loaded.
      if (opt_blob) {
        writer.truncate(opt_blob.size);
        waitForIO(writer, function() {
          writer.seek(0);
          writer.write(opt_blob);
        });
      } else {
        chosenFileEntry.file(function(file) {
          writer.truncate(file.fileSize);
          waitForIO(writer, function() {
            writer.seek(0);
            writer.write(file);
          });
        });
      }
    }, errorHandler);
  }

  function waitForIO(writer, callback) {
    // set a watchdog to avoid eventual locking:
    var start = performance.now();
    // wait for a few seconds
    var reentrant = function() {
      if (writer.readyState===writer.WRITING && performance.now()-start<4000) {
        setTimeout(reentrant, 100);
        return;
      }
      if (writer.readyState===writer.WRITING) {
        console.error("Write operation taking too long, aborting!"+
          " (current writer readyState is "+writer.readyState+")");
        writer.abort();
      } else {
        callback();
      }
    };
    setTimeout(reentrant, 100);
  };


  return {
    writeFileEntry : writeFileEntry,
    readAsText : readAsText
  }

})();


