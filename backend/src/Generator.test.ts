import { VelocityGenerator } from './Generator';
import { CMSTask, CMSProject } from '../../shared/types';

const mockProject: CMSProject = {
    id: 'test-proj',
    name: 'Research Ops',
    globalPrompt: '',
    knowledgeContext: '',
    scheduleInterval: 'daily'
};

const mockTask: CMSTask = {
    id: 'test-task',
    projectId: 'test-proj',
    title: 'Market Trends $',
    prompt: 'Market Trends',
    status: 'deployed',
    output: 'AI is growing fast in 2026.\nNumerous companies are investing.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tokenUsage: { input: 100, output: 200 }
};

const report = VelocityGenerator.generateReport(mockTask, mockProject);
console.log('--- GENERATED REPORT ---');
console.log(report);
console.log('------------------------');

if (report.includes('📊 STRATEGIC ANALYSIS') && report.includes('Executive Summary')) {
    console.log('✅ Strategic Theme Check Passed');
} else {
    throw new Error('❌ Strategic Theme Check Failed');
}

if (report.includes('300 total tokens')) {
    console.log('✅ Token Metadata Check Passed');
} else {
    throw new Error('❌ Token Metadata Check Failed');
}
