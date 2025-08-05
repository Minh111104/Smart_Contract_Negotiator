import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportContractToPDF = async (contractTitle, contractContent, participants = []) => {
  try {
    // Create a temporary div to render the contract content
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px';
    tempDiv.style.padding = '40px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    tempDiv.style.lineHeight = '1.6';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.color = 'black';
    
    // Create the contract content with proper formatting
    tempDiv.innerHTML = `
      <div style="margin-bottom: 30px;">
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #333;">${contractTitle}</h1>
        <p style="color: #666; margin-bottom: 20px;">
          Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </p>
        ${participants.length > 0 ? `
          <p style="color: #666; margin-bottom: 20px;">
            Participants: ${participants.map(p => p.username).join(', ')}
          </p>
        ` : ''}
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
      </div>
      <div style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 11px;">
        ${contractContent}
      </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    // Convert the div to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Remove the temporary div
    document.body.removeChild(tempDiv);
    
    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 10; // 10mm margin from top
    
    // Add first page
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 20);
    
    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
    }
    
    // Generate filename
    const filename = `${contractTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Download the PDF
    pdf.save(filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, error: error.message };
  }
};

export const exportContractAsText = (contractTitle, contractContent) => {
  try {
    const textContent = `
CONTRACT: ${contractTitle}
Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

${contractContent}
    `.trim();
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contractTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Text export error:', error);
    return { success: false, error: error.message };
  }
}; 