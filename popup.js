document.getElementById('yellow').addEventListener('click', () => highlight('yellow'));
document.getElementById('light-green').addEventListener('click', () => highlight('lightgreen'));
document.getElementById('aqua').addEventListener('click', () => highlight('aqua'));
document.getElementById('color-picker').addEventListener('input', (event) => highlight(event.target.value));
document.getElementById('add-note').addEventListener('click', addNote); // Event listener for adding notes
document.getElementById('export-notes').addEventListener('click', exportNotes); // Event listener for exporting notes

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    func: () => {
      const style = document.createElement('style');
      style.textContent = `
        .highlight {
          position: relative;
        }
        .delete-button {
          position: absolute;
          top: -10px;
          right: -10px;
          background-color: #ff4d4d;
          color: white;
          font-size: 12px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }
      `;
      document.head.appendChild(style);
    }
  });
});

function highlight(color, noteName = null) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (color, noteName) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        const span = document.createElement('span');
        span.style.backgroundColor = color;
        span.className = 'highlight';
        if (noteName) span.title = noteName; // Add the note name as a title for hover
        span.appendChild(range.extractContents());
        range.insertNode(span);

        // Adjust range to remove empty text nodes after the inserted span
        range.setStartAfter(span);
        selection.removeAllRanges();

        saveHighlights();

        function saveHighlights() {
          const highlights = [];
          document.querySelectorAll('.highlight').forEach((highlightElement) => {
            highlights.push({
              page: window.location.href,
              html: highlightElement.outerHTML,
              parentXPath: getXPath(highlightElement.parentNode),
              childIndex: Array.prototype.indexOf.call(highlightElement.parentNode.childNodes, highlightElement),
              noteName: highlightElement.title // Store the note name
            });
          });
          chrome.storage.local.set({ highlights });
        }

        function getXPath(node) {
          if (node.id !== '') {
            return 'id("' + node.id + '")';
          }
          if (node === document.body) {
            return node.tagName;
          }
          let ix = 0;
          const siblings = node.parentNode.childNodes;
          for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === node) {
              return getXPath(node.parentNode) + '/' + node.tagName + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === node.tagName) {
              ix++;
            }
          }
        }
      },
      args: [color, noteName]
    });
  });
}

function addNote() {
  const noteName = prompt("Enter note name:");
  if (noteName) {
    const color = prompt("Enter highlight color (e.g., yellow, lightgreen, aqua, or a hex color code):");
    if (color) {
      highlight(color, noteName);
    } else {
      alert("No color entered. Using default color 'yellow'.");
      highlight('yellow', noteName); // Default color for note highlights can be changed
    }
  }
}

function exportNotes() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        return new Promise((resolve) => {
          chrome.storage.local.get(['highlights'], (result) => {
            const highlights = result.highlights || [];
            const notes = highlights.map(highlight => ({
              noteName: highlight.noteName,
              text: (new DOMParser().parseFromString(highlight.html, 'text/html')).body.textContent
            }));
            resolve(notes);
          });
        });
      }
    }, (results) => {
      const notes = results[0].result;
      generatePDF(notes);
    });
  });
}

function generatePDF(notes) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;
  const pageHeight = doc.internal.pageSize.height;

  notes.forEach((note, index) => {
    doc.setFont("helvetica", "bold");
    doc.text(`Note ${index + 1}: ${note.noteName}`, 10, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(`Text: ${note.text}`, 180);
    splitText.forEach(line => {
      if (y > pageHeight - 10) { // Add a new page if the current page is full
        doc.addPage();
        y = 10;
      }
      doc.text(line, 10, y);
      y += 10;
    });

    if (y > pageHeight - 10) { // Add a new page if the current page is full
      doc.addPage();
      y = 10;
    } else {
      y += 10; // Add some space between notes
    }
  });

  doc.save('notes.pdf');
}


// document.getElementById('yellow').addEventListener('click', () => highlight('yellow'));
// document.getElementById('light-green').addEventListener('click', () => highlight('lightgreen'));
// document.getElementById('aqua').addEventListener('click', () => highlight('aqua'));
// document.getElementById('color-picker').addEventListener('input', (event) => highlight(event.target.value));
// document.getElementById('add-note').addEventListener('click', addNote); // Event listener for adding notes
// document.getElementById('export-notes').addEventListener('click', exportNotes); // Event listener for exporting notes

// chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//   chrome.scripting.executeScript({
//     target: { tabId: tabs[0].id },
//     func: () => {
//       const style = document.createElement('style');
//       style.textContent = `
//         .highlight {
//           position: relative;
//         }
//         .delete-button {
//           position: absolute;
//           top: -10px;
//           right: -10px;
//           background-color: #ff4d4d;
//           color: white;
//           font-size: 12px;
//           width: 20px;
//           height: 20px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           border: none;
//           border-radius: 50%;
//           cursor: pointer;
//           box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
//         }
//       `;
//       document.head.appendChild(style);
//     }
//   });
// });

// function highlight(color, noteName = null) {
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     chrome.scripting.executeScript({
//       target: { tabId: tabs[0].id },
//       func: (color, noteName) => {
//         const selection = window.getSelection();
//         if (!selection.rangeCount) return;
//         const range = selection.getRangeAt(0);

//         const span = document.createElement('span');
//         span.style.backgroundColor = color;
//         span.className = 'highlight';
//         if (noteName) span.title = noteName; // Add the note name as a title for hover
//         span.appendChild(range.extractContents());
//         range.insertNode(span);

//         // Adjust range to remove empty text nodes after the inserted span
//         range.setStartAfter(span);
//         selection.removeAllRanges();

//         saveHighlights();

//         function saveHighlights() {
//           const highlights = [];
//           document.querySelectorAll('.highlight').forEach((highlightElement) => {
//             highlights.push({
//               page: window.location.href,
//               html: highlightElement.outerHTML,
//               parentXPath: getXPath(highlightElement.parentNode),
//               childIndex: Array.prototype.indexOf.call(highlightElement.parentNode.childNodes, highlightElement),
//               noteName: highlightElement.title // Store the note name
//             });
//           });
//           chrome.storage.local.set({ highlights });
//         }

//         function getXPath(node) {
//           if (node.id !== '') {
//             return 'id("' + node.id + '")';
//           }
//           if (node === document.body) {
//             return node.tagName;
//           }
//           let ix = 0;
//           const siblings = node.parentNode.childNodes;
//           for (let i = 0; i < siblings.length; i++) {
//             const sibling = siblings[i];
//             if (sibling === node) {
//               return getXPath(node.parentNode) + '/' + node.tagName + '[' + (ix + 1) + ']';
//             }
//             if (sibling.nodeType === 1 && sibling.tagName === node.tagName) {
//               ix++;
//             }
//           }
//         }
//       },
//       args: [color, noteName]
//     });
//   });
// }

// function addNote() {
//   const noteName = prompt("Enter note name:");
//   if (noteName) {
//     highlight('yellow', noteName); // Default color for note highlights can be changed
//   }
// }

// function exportNotes() {
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     chrome.scripting.executeScript({
//       target: { tabId: tabs[0].id },
//       func: () => {
//         return new Promise((resolve) => {
//           chrome.storage.local.get(['highlights'], (result) => {
//             const highlights = result.highlights || [];
//             const notes = highlights.map(highlight => ({
//               noteName: highlight.noteName,
//               text: (new DOMParser().parseFromString(highlight.html, 'text/html')).body.textContent
//             }));
//             resolve(notes);
//           });
//         });
//       }
//     }, (results) => {
//       const notes = results[0].result;
//       generatePDF(notes);
//     });
//   });
// }

// function generatePDF(notes) {
//   const { jsPDF } = window.jspdf;
//   const doc = new jsPDF();

//   let y = 10;
//   const pageHeight = doc.internal.pageSize.height;

//   notes.forEach((note, index) => {
//     doc.setFont("helvetica", "bold");
//     doc.text(`Note ${index + 1}: ${note.noteName}`, 10, y);
//     y += 10;

//     doc.setFont("helvetica", "normal");
//     const splitText = doc.splitTextToSize(`Text: ${note.text}`, 180);
//     splitText.forEach(line => {
//       if (y > pageHeight - 10) { // Add a new page if the current page is full
//         doc.addPage();
//         y = 10;
//       }
//       doc.text(line, 10, y);
//       y += 10;
//     });

//     if (y > pageHeight - 10) { // Add a new page if the current page is full
//       doc.addPage();
//       y = 10;
//     } else {
//       y += 10; // Add some space between notes
//     }
//   });

//   doc.save('notes.pdf');
// }
