const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'backend', 'src', 'models');

function addProperties(file, beforeStr, propertiesStr) {
  const filepath = path.join(modelsDir, file);
  if (fs.existsSync(filepath)) {
    let content = fs.readFileSync(filepath, 'utf8');
    if (!content.includes(propertiesStr.trim().split('\n')[0])) {
      content = content.replace(beforeStr, propertiesStr + '\n' + beforeStr);
      fs.writeFileSync(filepath, content);
    }
  }
}

// Certificate.ts
addProperties('Certificate.ts', 'certificateUrl?: string;', 
  `  pdfBuffer?: any;
  studentName?: string;
  eventName?: string;
  eventDate?: any;
  issueDate?: any;
  qrCode?: string;
  verificationUrl?: string;`);

// CoordinatorRole.ts
addProperties('CoordinatorRole.ts', 'description?: string;',
  `  name?: string;
  order?: number;
  isActive?: boolean;`);

// Attendance.ts
const attPath = path.join(modelsDir, 'Attendance.ts');
let attContent = fs.readFileSync(attPath, 'utf8');
attContent = attContent.replace(`status: 'Present' | 'Absent';`, `status: 'PRESENT' | 'ABSENT' | 'Present' | 'Absent' | string;`);
attContent = attContent.replace(`enum: ['Present', 'Absent']`, `enum: ['PRESENT', 'ABSENT', 'Present', 'Absent']`);
if (!attContent.includes('eventDate')) {
  attContent = attContent.replace(`method?: string;`, `method?: string;
  eventDate?: any;`);
}
fs.writeFileSync(attPath, attContent);

// Resource.ts
addProperties('Resource.ts', 'link: string;',
  `  url?: string;
  uploadedBy?: any;
  createdAt?: Date;`);

// Event.ts
const eventPath = path.join(modelsDir, 'Event.ts');
let evContent = fs.readFileSync(eventPath, 'utf8');
evContent = evContent.replace(`date: Date;`, `date: any;`);
fs.writeFileSync(eventPath, evContent);
addProperties('Event.ts', 'isPublished: boolean;',
  `  registrationDeadline?: string;
  eventId?: string;
  capacity?: number;`);

// GoogleFormRegistration.ts
addProperties('GoogleFormRegistration.ts', 'responses: Record<string, any>;',
  `  responseId?: any;`);

// Member.ts
addProperties('Member.ts', 'joinedDate: Date;',
  `  team?: string;`);

// Admin.ts
addProperties('Admin.ts', 'role: string;',
  `  isActive?: boolean;`);

// CertificateCampaign.ts
addProperties('CertificateCampaign.ts', 'status: string;',
  `  name?: string;`);

console.log("TypeScript interface fixes applied.");
