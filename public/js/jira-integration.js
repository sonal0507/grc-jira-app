/**
 * JIRA Integration Module for GRC Platform
 * Fixed version with direct visible button
 */

// Pre-configured JIRA credentials
const PRECONFIG_CREDENTIALS = {
    baseUrl: 'https://oswalshobha31-1768193369440.atlassian.net',
    email: 'oswalshobha31@gmail.com',
    apiToken: 'ATATT3xFfGF0oGGYURTAmZNdWikwapyZ1bXpke8Vmyf05RFhSsX3f0fNSLg5VL_dRce6CUSo7E0xdiYJ94UAAhi0s5lLZOiuS2ErrV_I7QgHGT2gHLYBo8tB7mHvgXMZWwuHec1sidrjM6xUt4oam9czecNZcEvCG3aaJSWSG4CqaMBYPCtVLmA=B479E0BF',
    projectKey: 'SCRUM'
};

// JIRA Integration Namespace
window.JIRAIntegration = {
    CONFIG_STORAGE_KEY: 'grc_jira_config',
    TICKETS_STORAGE_KEY: 'grc_jira_tickets',
    
    config: {
        baseUrl: '',
        email: '',
        apiToken: '',
        projectKey: 'SCRUM',
        issueType: 'Task',
        autoCreate: false
    },

    /**
     * Initialize JIRA integration
     */
    init: function() {
        console.log('🚀 JIRA Integration initializing...');
        this.loadConfig();
        // Add visible button to page
        this.addDirectButton();
        console.log('✅ JIRA Integration initialized');
        console.log('📋 Config:', this.config.baseUrl ? 'Loaded' : 'Not loaded');
    },

    /**
     * Load configuration
     */
    loadConfig: function() {
        try {
            const stored = localStorage.getItem(this.CONFIG_STORAGE_KEY);
            if (stored) {
                this.config = { ...this.config, ...JSON.parse(stored) };
                console.log('✅ Loaded config from localStorage');
            } else {
                // Use pre-configured credentials
                this.config = { ...this.config, ...PRECONFIG_CREDENTIALS };
                localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(this.config));
                console.log('✅ Using pre-configured credentials');
            }
        } catch (e) {
            console.error('Failed to load config:', e);
            this.config = { ...this.config, ...PRECONFIG_CREDENTIALS };
        }
        console.log('📋 JIRA URL:', this.config.baseUrl);
        console.log('📋 JIRA Project:', this.config.projectKey);
    },

    /**
     * Check if JIRA is properly configured
     */
    isConfigured: function() {
        return !!(this.config.baseUrl && this.config.email && this.config.apiToken && this.config.projectKey);
    },

    /**
     * Add a DIRECT visible button to create JIRA tickets
     */
    addDirectButton: function() {
        // Remove existing button if any
        const existingBtn = document.getElementById('directJIRABtn');
        if (existingBtn) existingBtn.remove();
        
        // Try to find results actions container
        const actionContainers = [
            'resultsActions',
            'actionButtons',
            'assessmentActions',
            'results-container',
            'resultsContainer'
        ];
        
        let container = null;
        for (const id of actionContainers) {
            container = document.getElementById(id) || document.querySelector('.' + id);
            if (container) break;
        }
        
        // If no container found, look for buttons after View Results
        if (!container) {
            // Look for Save Assessment, Export CSV buttons
            const saveBtn = document.querySelector('button:contains("Save Assessment")') || 
                           document.querySelector('[onclick*="saveAssessment"]') ||
                           document.querySelector('.btn-primary');
            
            if (saveBtn && saveBtn.parentElement) {
                container = saveBtn.parentElement;
            }
        }
        
        // Create button directly
        const jiraBtn = document.createElement('button');
        jiraBtn.id = 'directJIRABtn';
        jiraBtn.className = 'btn btn-primary btn-lg me-2';
        jiraBtn.innerHTML = '<i class="fab fa-jira me-2"></i>Create JIRA Tickets';
        jiraBtn.style.cssText = 'background: #0052CC !important; border-color: #0052CC !important; margin: 10px 0; padding: 12px 24px; font-size: 16px;';
        jiraBtn.onclick = () => this.createTicketsNow();
        
        // Try to insert after Save Assessment button
        const saveAssessmentBtn = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent && btn.textContent.includes('Save Assessment'));
        
        if (saveAssessmentBtn && saveAssessmentBtn.parentElement) {
            saveAssessmentBtn.parentElement.insertBefore(jiraBtn, saveAssessmentBtn.nextSibling);
            console.log('✅ Added JIRA button after Save Assessment');
        } else {
            // Insert at top of body for visibility
            document.body.insertBefore(jiraBtn, document.body.firstChild);
            jiraBtn.style.position = 'fixed';
            jiraBtn.style.top = '100px';
            jiraBtn.style.right = '20px';
            jiraBtn.style.zIndex = '9999';
            jiraBtn.style.boxShadow = '0 4px 12px rgba(0,82,204,0.4)';
            console.log('✅ Added floating JIRA button');
        }
        
        // Show notification
        this.showNotification('JIRA Integration ready! Click the button to create tickets.', 'success');
    },

    /**
     * Create tickets NOW - main function
     */
    createTicketsNow: function() {
        console.log('🎯 Creating JIRA tickets...');
        
        if (!this.isConfigured()) {
            alert('JIRA is not configured. Please configure it first.');
            this.showConfigModal();
            return;
        }
        
        // Get gaps from assessment
        const framework = inlineAssessmentState?.currentFramework || window.currentFramework;
        if (!framework) {
            alert('Please complete an assessment first.');
            return;
        }
        
        const gaps = this.identifyGaps(framework);
        if (gaps.length === 0) {
            alert('No compliance gaps found! All controls are 100% compliant.');
            return;
        }
        
        // Show confirmation
        const confirmMsg = `Found ${gaps.length} compliance gaps.\n\n` +
                          `This will create ${gaps.length} JIRA tickets in project "${this.config.projectKey}".\n\n` +
                          `Do you want to continue?`;
        
        if (!confirm(confirmMsg)) return;
        
        // Create tickets
        this.createTicketsBatch(gaps, 0, []);
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
                if (answer === undefined || answer < 100) {
                    gaps.push({
                        id: question.id,
                        framework: frameworkCode,
                        frameworkName: assessmentData.name,
                        section: section.name,
                        text: question.text,
                        description: question.description,
                        currentScore: answer || 0,
                        severity: this.calculateSeverity(answer)
                    });
                }
            });
        });
        
        return gaps.sort((a, b) => a.currentScore - b.currentScore);
    },

    calculateSeverity: function(score) {
        if (score === undefined || score === 0) return 'High';
        if (score < 25) return 'High';
        if (score < 75) return 'Medium';
        return 'Low';
    },

    /**
     * Create tickets in batch
     */
    createTicketsBatch: function(gaps, index, createdTickets) {
        if (index >= gaps.length) {
            // All done
            this.showNotification(`🎉 Created ${createdTickets.length} of ${gaps.length} JIRA tickets!`, 'success');
            this.showCreatedTickets(createdTickets);
            return;
        }
        
        const gap = gaps[index];
        console.log(`Creating ticket ${index + 1}/${gaps.length}: ${gap.id}`);
        
        // Build ticket payload
        const payload = {
            fields: {
                project: { key: this.config.projectKey },
                summary: `[Gap] ${gap.id} - ${gap.frameworkName}: ${gap.text.substring(0, 80)}...`,
                issuetype: { name: this.config.issueType || 'Task' },
                description: {
                    type: 'doc',
                    version: 1,
                    content: [{
                        type: 'paragraph',
                        content: [{
                            type: 'text',
                            text: `Framework: ${gap.frameworkName}\nSection: ${gap.section}\nControl: ${gap.id}\n\nIssue: ${gap.text}\n\nCurrent Score: ${gap.currentScore}%\nSeverity: ${gap.severity}\n\nRemediation Required: This control needs to be fully implemented to achieve 100% compliance.`
                        }]
                    }]
                },
                priority: { name: gap.severity }
            }
        };
        
        // Call API
        fetch('/api/jira/create-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                baseUrl: this.config.baseUrl,
                email: this.config.email,
                apiToken: this.config.apiToken,
                projectKey: this.config.projectKey,
                ...payload.fields
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                createdTickets.push({
                    key: data.ticketKey,
                    url: data.ticketUrl,
                    id: gap.id
                });
                console.log(`✅ Created: ${data.ticketKey}`);
            } else {
                console.log(`❌ Failed: ${data.error}`);
            }
        })
        .catch(error => {
            console.log(`❌ Error: ${error.message}`);
        })
        .finally(() => {
            this.createTicketsBatch(gaps, index + 1, createdTickets);
        });
    },

    /**
     * Show created tickets
     */
    showCreatedTickets: function(tickets) {
        if (tickets.length === 0) return;
        
        let html = '<div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">';
        html += '<h4 style="color: #0052CC; margin-bottom: 15px;"><i class="fab fa-jira me-2"></i>Created JIRA Tickets</h4>';
        
        tickets.forEach(ticket => {
            html += `<a href="${ticket.url}" target="_blank" style="display: block; padding: 10px; margin: 5px 0; background: white; border-radius: 4px; text-decoration: none; color: #0052CC; border: 1px solid #dee2e6;">`;
            html += `<strong>${ticket.key}</strong> - ${ticket.id}`;
            html += '</a>';
        });
        
        html += '</div>';
        
        // Insert at top of body
        const container = document.createElement('div');
        container.id = 'createdJIRATickets';
        container.innerHTML = html;
        document.body.insertBefore(container, document.body.firstChild);
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.zIndex = '9999';
        container.style.maxWidth = '500px';
        container.style.maxHeight = '80vh';
        container.style.overflow = 'auto';
        container.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 24px; cursor: pointer;';
        closeBtn.onclick = () => container.remove();
        container.insertBefore(closeBtn, container.firstChild);
        
        // Background overlay
        const overlay = document.createElement('div');
        overlay.id = 'jiraOverlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9998;';
        overlay.onclick = () => { container.remove(); overlay.remove(); };
        document.body.appendChild(overlay);
    },

    /**
     * Show configuration modal
     */
    showConfigModal: function() {
        const modalHTML = `
            <div id="jiraConfigModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
                    <h3 style="color: #0052CC; margin-bottom: 20px;"><i class="fab fa-jira me-2"></i>JIRA Configuration</h3>
                    
                    <div class="mb-3">
                        <label style="font-weight: bold;">JIRA Base URL</label>
                        <input type="text" id="jiraBaseUrl" class="form-control" value="${this.config.baseUrl}" readonly>
                    </div>
                    
                    <div class="mb-3">
                        <label style="font-weight: bold;">Email</label>
                        <input type="text" id="jiraEmail" class="form-control" value="${this.config.email}" readonly>
                    </div>
                    
                    <div class="mb-3">
                        <label style="font-weight: bold;">Project Key</label>
                        <input type="text" id="jiraProjectKey" class="form-control" value="${this.config.projectKey}">
                    </div>
                    
                    <div class="mb-3">
                        <label style="font-weight: bold;">Issue Type</label>
                        <select id="jiraIssueType" class="form-control">
                            <option value="Task" ${this.config.issueType === 'Task' ? 'selected' : ''}>Task</option>
                            <option value="Bug" ${this.config.issueType === 'Bug' ? 'selected' : ''}>Bug</option>
                            <option value="Story" ${this.config.issueType === 'Story' ? 'selected' : ''}>Story</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="JIRAIntegration.saveAndClose()" class="btn btn-primary" style="flex: 1; background: #0052CC; border: none; padding: 12px;">Save</button>
                        <button onclick="document.getElementById('jiraConfigModal').remove(); document.getElementById('jiraOverlay').remove();" class="btn btn-secondary" style="flex: 1; padding: 12px;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    saveAndClose: function() {
        this.config.projectKey = document.getElementById('jiraProjectKey').value || 'SCRUM';
        this.config.issueType = document.getElementById('jiraIssueType').value || 'Task';
        localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(this.config));
        
        document.getElementById('jiraConfigModal').remove();
        document.getElementById('jiraOverlay').remove();
        
        this.showNotification('Configuration saved!', 'success');
        this.createTicketsNow();
    },

    showNotification: function(message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#36B37E' : '#0052CC'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        notification.innerHTML = `<strong>${message}</strong>`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.JIRAIntegration) {
            window.JIRAIntegration.init();
        }
    }, 2000);
});

// Also initialize on page load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (window.JIRAIntegration) {
            window.JIRAIntegration.init();
        }
    }, 2000);
}
