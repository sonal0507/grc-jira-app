/**
 * JIRA Integration Module for GRC Platform
 * Simple integration with inline assessment system
 */

// Pre-configured JIRA credentials
const PRECONFIG_CREDENTIALS = {
    baseUrl: 'https://oswalshobha31-1768193369440.atlassian.net',
    email: 'oswalshobha31@gmail.com',
    apiToken: 'ATATT3xFfGF0oGGYURTAmZNdWikwapyZ1bXpke8Vmyf05RFhSsX3f0fNSLg5VL_dRce6CUSo7E0xdiYJ94UAAhi0s5lLZOiuS2ErrV_I7QgHGT2gHLYBo8tB7mHvgXMZWwuHec1sidrjM6xUt4oam9czecNZcEvCG3aaJSWSG4CqaMBYPCtVLmA=B479E0BF',
    projectKey: 'MY_NEW_PROJECT_KEY'
};

// JIRA Integration Namespace
window.JIRAIntegration = {
    CONFIG_STORAGE_KEY: 'grc_jira_config',
    TICKETS_STORAGE_KEY: 'grc_jira_tickets',
    
    config: {
        baseUrl: '',
        email: '',
        apiToken: '',
        projectKey: 'MY_NEW_PROJECT_KEY',
        issueType: 'Task',
        autoCreate: false
    },

    /**
     * Initialize JIRA integration
     */
    init: function() {
        console.log('🚀 JIRA Integration initializing...');
        this.loadConfig();
        console.log('✅ JIRA Integration initialized');
        console.log('📋 JIRA Project:', this.config.projectKey);
    },

    /**
     * Load configuration
     */
    loadConfig: function() {
        try {
            const stored = localStorage.getItem(this.CONFIG_STORAGE_KEY);
            if (stored) {
                this.config = { ...this.config, ...JSON.parse(stored) };
            } else {
                // Use pre-configured credentials
                this.config = { ...this.config, ...PRECONFIG_CREDENTIALS };
                localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(this.config));
            }
        } catch (e) {
            console.error('Failed to load config:', e);
            this.config = { ...this.config, ...PRECONFIG_CREDENTIALS };
        }
    },

    /**
     * Check if JIRA is properly configured
     */
    isConfigured: function() {
        return !!(this.config.baseUrl && this.config.email && this.config.apiToken && this.config.projectKey);
    },

    /**
     * Identify gaps from assessment
     */
    identifyGaps: function(frameworkCode) {
        const assessmentData = window.frameworkAssessments?.[frameworkCode];
        if (!assessmentData) return [];
        
        const responses = inlineAssessmentState?.responses || window.responses || {};
        const gaps = [];
        
        assessmentData.sections?.forEach(section => {
            section.questions?.forEach(question => {
                const answer = responses[question.id];
                if (answer !== 'yes') {
                    const severity = answer === 'no' ? 'High' : (answer === 'partial' ? 'Medium' : 'High');
                    gaps.push({
                        id: question.id,
                        framework: frameworkCode,
                        frameworkName: assessmentData.name,
                        section: section.name,
                        text: question.item_text || question.text,
                        currentScore: answer === 'yes' ? 100 : (answer === 'partial' ? 50 : 0),
                        severity: severity,
                        requirement_ref: question.requirement_ref || '',
                        help_text: question.help_text || ''
                    });
                }
            });
        });
        
        return gaps.sort((a, b) => a.currentScore - b.currentScore);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.JIRAIntegration) {
            window.JIRAIntegration.init();
        }
    }, 1000);
});

// Also initialize on page load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (window.JIRAIntegration) {
            window.JIRAIntegration.init();
        }
    }, 1000);
}
