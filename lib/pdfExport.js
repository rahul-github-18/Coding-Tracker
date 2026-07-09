import { todoService, questionService } from './api';

export const generateNotesPDF = async (setGlobalError) => {
  try {
    // Dynamically import jsPDF to prevent SSR window reference errors
    const { jsPDF } = await import('jspdf');

    // 1. Fetch todos
    const todos = await todoService.getTodos();
    if (!todos || todos.length === 0) {
      alert("No data available to export. Create some todos first!");
      return null;
    }

    // 2. Fetch full questions details (notes, code) for each todo in parallel to avoid waterfall requests
    const questionsPromises = todos.map(todo => questionService.getQuestions(todo.id));
    const allQuestionsResult = await Promise.all(questionsPromises);
    
    const fullData = todos.map((todo, idx) => ({
      ...todo,
      questions: allQuestionsResult[idx] || []
    }));

    // 3. Initialize PDF (A4 size, portrait, mm units)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2); // 170mm
    let y = margin;

    const checkPageBreak = (neededHeight) => {
      // If content exceeds printable height, add a new page
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // App Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(26, 115, 232); // Blue
    doc.text("CodeDiary", margin, y);
    y += 10;

    // Current Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(95, 99, 104); // Gray
    const dateStr = `Exported on: ${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    doc.text(dateStr, margin, y);
    y += 15;

    // Divider Line
    doc.setDrawColor(218, 220, 224);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Render Todos
    for (const todo of fullData) {
      // Check page break for Todo title
      checkPageBreak(15);

      // Todo Heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(32, 33, 36);
      doc.text(todo.title, margin, y);
      y += 8;

      // Status info
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(128, 134, 139);
      doc.text(`Created: ${todo.created_date}  |  Status: ${todo.completed ? 'Completed' : 'In Progress'}`, margin, y);
      y += 10;

      // Check if questions exist
      if (todo.questions.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(95, 99, 104);
        doc.text("No questions under this topic.", margin + 5, y);
        y += 12;
        continue;
      }

      // Loop Questions
      for (const q of todo.questions) {
        // Prepare question headers
        checkPageBreak(25);

        // Question Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(26, 115, 232);
        doc.text(`Question: ${q.title}`, margin + 5, y);
        y += 6;

        // Last Updated
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(128, 134, 139);
        const lastUpdated = q.updated_at 
          ? new Date(q.updated_at).toLocaleString() 
          : 'Never';
        doc.text(`Last Updated: ${lastUpdated}`, margin + 5, y);
        y += 8;

        // Question Notes
        if (q.notes && q.notes.trim() !== '') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(60, 64, 67);
          doc.text("Notes:", margin + 5, y);
          y += 5;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(32, 33, 36);
          
          // Split notes text to wrap
          const wrappedNotes = doc.splitTextToSize(q.notes, contentWidth - 5);
          const notesHeight = wrappedNotes.length * 5;
          checkPageBreak(notesHeight + 5);

          wrappedNotes.forEach(line => {
            doc.text(line, margin + 5, y);
            y += 5;
          });
          y += 4;
        }

        // Question Code
        if (q.code && q.code.trim() !== '') {
          checkPageBreak(15);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(60, 64, 67);
          doc.text("Code:", margin + 5, y);
          y += 6;

          doc.setFont('courier', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(32, 33, 36);

          const codeLines = doc.splitTextToSize(q.code, contentWidth - 15);
          const codeLineHeight = 4.5;
          const padding = 4;

          // If code is too long, we need to draw it segment by segment across pages
          let currentLineIndex = 0;
          
          while (currentLineIndex < codeLines.length) {
            // Find how many lines fit on the current page
            const remainingPageHeight = pageHeight - margin - y;
            const linesThatFit = Math.floor((remainingPageHeight - (padding * 2)) / codeLineHeight);

            if (linesThatFit <= 0) {
              doc.addPage();
              y = margin;
              continue;
            }

            const batchLines = codeLines.slice(currentLineIndex, currentLineIndex + linesThatFit);
            const currentBoxHeight = (batchLines.length * codeLineHeight) + (padding * 2);

            // Draw light gray background box
            doc.setFillColor(245, 247, 250);
            doc.rect(margin + 5, y, contentWidth - 5, currentBoxHeight, 'F');

            // Write the lines inside the box
            let codeY = y + padding + 3; // Offset text alignment
            doc.setTextColor(51, 51, 51);
            batchLines.forEach(line => {
              doc.text(line, margin + 8, codeY);
              codeY += codeLineHeight;
            });

            y += currentBoxHeight + 5;
            currentLineIndex += linesThatFit;
          }
        }
        y += 6; // Space after a question
      }
      y += 10; // Space after a todo
    }

    return doc;
  } catch (error) {
    console.error("PDF generation failed:", error);
    if (setGlobalError) {
      setGlobalError("Failed to generate PDF. Please ensure all items are sync'd.");
    } else {
      alert("Failed to export PDF.");
    }
    return null;
  }
};

export const generateTopicPDF = async (topic, questions) => {
  try {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    const checkPageBreak = (neededHeight) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(26, 115, 232);
    doc.text(topic.title, margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(95, 99, 104);
    doc.text(`Category: ${topic.category}  |  Difficulty: ${topic.difficulty}`, margin, y);
    y += 12;

    // Divider
    doc.setDrawColor(218, 220, 224);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Loop questions
    if (questions.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(95, 99, 104);
      doc.text("No questions under this topic.", margin, y);
    } else {
      for (const q of questions) {
        checkPageBreak(25);
        
        // Question Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(26, 115, 232);
        doc.text(`Question: ${q.title}`, margin, y);
        y += 6;

        // Notes
        if (q.notes && q.notes.trim() !== '') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(60, 64, 67);
          doc.text("Notes:", margin, y);
          y += 5;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(32, 33, 36);
          const wrappedNotes = doc.splitTextToSize(q.notes, contentWidth);
          const notesHeight = wrappedNotes.length * 5;
          checkPageBreak(notesHeight + 5);

          wrappedNotes.forEach(line => {
            doc.text(line, margin, y);
            y += 5;
          });
          y += 4;
        }

        // Code
        if (q.code && q.code.trim() !== '') {
          checkPageBreak(15);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(60, 64, 67);
          doc.text("Code:", margin, y);
          y += 6;

          doc.setFont('courier', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(32, 33, 36);

          const codeLines = doc.splitTextToSize(q.code, contentWidth - 10);
          const codeLineHeight = 4.5;
          const padding = 4;

          let currentLineIndex = 0;
          while (currentLineIndex < codeLines.length) {
            const remainingPageHeight = pageHeight - margin - y;
            const linesThatFit = Math.floor((remainingPageHeight - (padding * 2)) / codeLineHeight);

            if (linesThatFit <= 0) {
              doc.addPage();
              y = margin;
              continue;
            }

            const batchLines = codeLines.slice(currentLineIndex, currentLineIndex + linesThatFit);
            const currentBoxHeight = (batchLines.length * codeLineHeight) + (padding * 2);

            doc.setFillColor(245, 247, 250);
            doc.rect(margin, y, contentWidth, currentBoxHeight, 'F');

            let codeY = y + padding + 3;
            doc.setTextColor(51, 51, 51);
            batchLines.forEach(line => {
              doc.text(line, margin + 3, codeY);
              codeY += codeLineHeight;
            });

            y += currentBoxHeight + 5;
            currentLineIndex += linesThatFit;
          }
        }
        y += 6;
      }
    }

    return doc;
  } catch (error) {
    console.error("PDF generation for topic failed:", error);
    return null;
  }
};
