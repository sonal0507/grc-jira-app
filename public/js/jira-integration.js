/**
 * JIRA Integration Module for GRC Platform
 * Handles JIRA configuration, gap detection, and ticket creation
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
    // Configuration storage key
    CONFIG_STORAGE_KEY: 'grc_jira_config',
    TICKETS_STORAGE_KEY: 'grc_jira_tickets',
    
    // Default configuration
    config: {
        baseUrl: '',
        email: '',
        apiToken: '',
        projectKey: '',
        issueType: 'Task',
        autoCreate: false,
        priorityMapping: {
            high: { threshold: 25, jiraPriority: 'High' },
            medium: { threshold: 75, jiraPriority: 'Medium' },
            low: { threshold: 100, jiraPriority: 'Low' }
        }
    },

    /**
     * Initialize JIRA integration
     */
    init: function() {
        this.loadConfig();
        this.addJIRASectionToResults();
        console.log('JIRA Integration initialized');
    },

    /**
     * Load configuration from localStorage or use pre-configured values
     */
    loadConfig: function() {
        try {
            const stored = localStorage.getItem(this.CONFIG_STORAGE_KEY);
            if (stored) {
                this.config = { ...this.config, ...JSON.parse(stored) };
            } else {
                // Use pre-configured credentials if available
                this.config = { ...this.config, ...PRECONFIG_CREDENTIALS };
                // Save pre-configured credentials
                this.saveConfig(this.config);
            }
        } catch (e) {
            console.error('Failed to load JIRA config:', e);
            // Fall back to pre-configured credentials
            this.config = { ...this.config, ...PRECONFIG_CREDENTIALS };
        }
    },

    /**
     * Save configuration to localStorage
     */
    saveConfig: function(newConfig) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    },

    /**
     * Check if JIRA is configured
     */
    isConfigured: function() {
        return !!(this.config.baseUrl && this.config.email && this.config.apiToken && this.config.projectKey);
    },

    /**
     * Add JIRA section to assessment results
     */
    addJIRASectionToResults: function() {
        // Create JIRA container and insert after score breakdown
        const scoreBreakdown = document.getElementById('scoreBreakdown');
        if (scoreBreakdown) {
            const jiraContainer = document.createElement('div');
            jiraContainer.id = 'jiraIntegrationContainer';
            jiraContainer.innerHTML = this.getJIRAIntegrationHTML();
            scoreBreakdown.parentNode.insertBefore(jiraContainer, scoreBreakdown.nextSibling);
            
            // Bind events
            this.bindJIRAEvents();
        } else {
            // Try to add to results container
            const resultsContainer = document.getElementById('resultsContainer');
            if (resultsContainer) {
                const jiraContainer = document.createElement('div');
                jiraContainer.id = 'jiraIntegrationContainer';
                jiraContainer.innerHTML = this.getJIRAIntegrationHTML();
                resultsContainer.appendChild(jiraContainer);
                this.bindJIRAEvents();
            }
        }
    },

    /**
     * Get JIRA integration HTML
     */
    getJIRAIntegrationHTML: function() {
        return `
            <div class="card mt-4 border-primary">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0"><i class="fab fa-jira me-2"></i>JIRA Integration</h5>
                    <button class="btn btn-sm btn-light" onclick="JIRAIntegration.toggleConfig()">
                        <i class="fas fa-cog"></i> Settings
                    </button>
                </div>
                <div class="card-body">
                    <!-- Configuration Section -->
                    <div id="jiraConfigSection" style="display: none;" class="mb-4">
                        <h6>JIRA Configuration</h6>
                        <form id="jiraConfigForm" class="row g-3">
                            <div class="col-12">
                                <label class="form-label">JIRA Base URL</label>
                                <input type="url" class="form-control" id="jiraBaseUrl" 
                                    placeholder="https://your-domain.atlassian.net" required>
                                <small class="text-muted">Your JIRA cloud instance URL</small>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" id="jiraEmail" 
                                    placeholder="admin@company.com" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">API Token</label>
                                <input type="password" class="form-control" id="jiraApiToken" 
                                    placeholder="Your JIRA API token" required>
                                <small class="text-muted">
                                    <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank">
                                        Generate API Token
                                    </a>
                                </small>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Project Key</label>
                                <input type="text" class="form-control" id="jiraProjectKey" 
                                    placeholder="GRC" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Issue Type</label>
                                <select class="form-select" id="jiraIssueType">
                                    <option value="Task">Task</option>
                                    <option value="Bug">Bug</option>
                                    <option value="Story">Story</option>
                                </select>
                            </div>
                            <div class="col-12">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="jiraAutoCreate">
                                    <label class="form-check-label" for="jiraAutoCreate">
                                        Automatically create tickets when gaps are detected
                                    </label>
                                </div>
                            </div>
                            <div class="col-12">
                                <button type="button" class="btn btn-secondary me-2" onclick="JIRAIntegration.testConnection(this)">
                                    <i class="fas fa-plug"></i> Test Connection
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Save Configuration
                                </button>
                            </div>
                        </form>
                        <hr>
                    </div>

                    <!-- Gap Summary Section -->
                    <div id="jiraGapSummary">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="mb-0">Identified Gaps</h6>
                            <span id="gapCountBadge" class="badge bg-warning">0 gaps found</span>
                        </div>
                        
                        <div id="gapsList" class="mb-3" style="max-height: 300px; overflow-y: auto;">
                            <p class="text-muted text-center">Complete an assessment to see gaps</p>
                        </div>

                        <div class="d-flex gap-2">
                            <button id="btnAnalyzeGaps" class="btn btn-outline-primary" onclick="JIRAIntegration.analyzeGaps()" disabled>
                                <i class="fas fa-search"></i> Analyze Gaps
                            </button>
                            <button id="btnCreateTickets" class="btn btn-primary" onclick="JIRAIntegration.showCreateTicketsModal()" disabled>
                                <i class="fab fa-jira"></i> Create JIRA Tickets
                            </button>
                        </div>
                    </div>

                    <!-- Created Tickets Section -->
                    <div id="jiraTicketsSection" class="mt-4" style="display: none;">
                        <h6>Created Tickets</h6>
                        <div id="createdTicketsList" class="list-group list-group-flush"></div>
                    </div>
                </div>
            </div>

            <!-- Create Tickets Modal -->
            <div class="modal fade" id="createTicketsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Create JIRA Tickets</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <strong><span id="selectedGapsCount">0</span> tickets</strong> will be created in project 
                                <strong id="modalProjectKey">GRC</strong>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="selectAllGaps" checked 
                                    onchange="JIRAIntegration.toggleAllGaps(this.checked)">
                                <label class="form-check-label" for="selectAllGaps">
                                    Select/Deselect All
                                </label>
                            </div>
                            
                            <div id="modalGapsList" class="list-group" style="max-height: 400px; overflow-y: auto;">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="JIRAIntegration.createTickets()">
                                <i class="fab fa-jira"></i> Create Tickets
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progress Modal -->
            <div class="modal fade" id="jiraProgressModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Creating JIRA Tickets</h5>
                        </div>
                        <div class="modal-body">
                            <div class="progress mb-3">
                                <div id="jiraProgressBar" class="progress-bar" role="progressbar" style="width: 0%"></div>
                            </div>
                            <p id="jiraProgressText" class="text-center">Initializing...</p>
                            <ul id="jiraProgressLog" class="list-unstyled small"></ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Bind JIRA-related event handlers
     */
    bindJIRAEvents: function() {
        // Configuration form submission
        const configForm = document.getElementById('jiraConfigForm');
        if (configForm) {
            configForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveConfiguration();
            });
        }

        // Load existing configuration
        if (this.config.baseUrl) {
            document.getElementById('jiraBaseUrl').value = this.config.baseUrl;
            document.getElementById('jiraEmail').value = this.config.email;
            document.getElementById('jiraProjectKey').value = this.config.projectKey;
            document.getElementById('jiraIssueType').value = this.config.issueType || 'Task';
            document.getElementById('jiraAutoCreate').checked = this.config.autoCreate || false;
        }

        // Check if we should show gaps
        this.checkExistingGaps();
    },

    /**
     * Toggle configuration visibility
     */
    toggleConfig: function() {
        const section = document.getElementById('jiraConfigSection');
        if (section) {
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }
    },

    /**
     * Save JIRA configuration
     */
    saveConfiguration: function() {
        const config = {
            baseUrl: document.getElementById('jiraBaseUrl').value.trim(),
            email: document.getElementById('jiraEmail').value.trim(),
            apiToken: document.getElementById('jiraApiToken').value,
            projectKey: document.getElementById('jiraProjectKey').value.trim().toUpperCase(),
            issueType: document.getElementById('jiraIssueType').value,
            autoCreate: document.getElementById('jiraAutoCreate').checked
        };

        this.saveConfig(config);
        
        // Show notification
        if (typeof showNotification === 'function') {
            showNotification('JIRA configuration saved', 'success');
        } else {
            alert('JIRA configuration saved successfully!');
        }
        
        this.toggleConfig();
    },

    /**
     * Test JIRA connection
     */
    testConnection: function(btnElement) {
        const baseUrl = document.getElementById('jiraBaseUrl').value.trim();
        const email = document.getElementById('jiraEmail').value.trim();
        const apiToken = document.getElementById('jiraApiToken').value;
        const projectKey = document.getElementById('jiraProjectKey').value.trim().toUpperCase();

        if (!baseUrl || !email || !apiToken || !projectKey) {
            if (typeof showNotification === 'function') {
                showNotification('Please fill in all fields', 'warning');
            } else {
                alert('Please fill in all fields');
            }
            return;
        }

        // Handle button state
        const btn = btnElement;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        btn.disabled = true;

        // Call backend API
        fetch('/api/jira/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ baseUrl, email, apiToken, projectKey })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (typeof showNotification === 'function') {
                    showNotification('Connection successful! Project: ' + (data.project?.name || projectKey), 'success');
                } else {
                    alert('Connection successful! Project: ' + (data.project?.name || projectKey));
                }
            } else {
                if (typeof showNotification === 'function') {
                    showNotification('Connection failed: ' + (data.error || data.message), 'error');
                } else {
                    alert('Connection failed: ' + (data.error || data.message));
                }
            }
        })
        .catch(error => {
            if (typeof showNotification === 'function') {
                showNotification('Connection error: ' + error.message, 'error');
            } else {
                alert('Connection error: ' + error.message);
            }
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    },

    /**
     * Check for existing gaps from completed assessments
     */
    checkExistingGaps: function() {
        const frameworks = Object.keys(window.frameworkAssessments || {});
        const completedAssessments = [];

        frameworks.forEach(fw => {
            const storageKey = 'assessment_complete_' + fw;
            const completed = localStorage.getItem(storageKey);
            if (completed) {
                try {
                    const data = JSON.parse(completed);
                    if (data.score < 100) {
                        completedAssessments.push({
                            framework: fw,
                            name: window.frameworkAssessments?.[fw]?.name || fw,
                            score: data.score,
                            completedAt: data.completedAt
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse assessment data:', e);
                }
            }
        });

        if (completedAssessments.length > 0) {
            const analyzeBtn = document.getElementById('btnAnalyzeGaps');
            const gapBadge = document.getElementById('gapCountBadge');
            if (analyzeBtn) analyzeBtn.disabled = false;
            if (gapBadge) gapBadge.textContent = `${completedAssessments.length} assessment(s) with gaps`;
        }
    },

    /**
     * Analyze gaps from current assessment
     */
    analyzeGaps: function() {
        if (!inlineAssessmentState?.currentFramework && !window.currentFramework) {
            if (typeof showNotification === 'function') {
                showNotification('Please complete an assessment first', 'warning');
            } else {
                alert('Please complete an assessment first');
            }
            return;
        }

        const framework = inlineAssessmentState?.currentFramework || window.currentFramework;
        const gaps = this.identifyGaps(framework);
        
        if (gaps.length === 0) {
            document.getElementById('gapsList').innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i> No gaps found! All controls are fully implemented.
                </div>
            `;
            const createBtn = document.getElementById('btnCreateTickets');
            if (createBtn) createBtn.disabled = true;
        } else {
            this.renderGapsList(gaps);
            const createBtn = document.getElementById('btnCreateTickets');
            if (createBtn) createBtn.disabled = false;
            const gapBadge = document.getElementById('gapCountBadge');
            if (gapBadge) gapBadge.textContent = `${gaps.length} gaps found`;
        }
    },

    /**
     * Identify gaps in an assessment
     */
    identifyGaps: function(frameworkCode) {
        const assessmentData = window.frameworkAssessments?.[frameworkCode];
        if (!assessmentData) return [];

        const responses = inlineAssessmentState?.responses || window.responses || {};
        const gaps = [];

        assessmentData.sections?.forEach(section => {
            section.questions?.forEach(question => {
                const answer = responses[question.id];
                
                // If question was not answered or score < 100, it's a gap
                if (answer === undefined || answer < 100) {
                    const severity = this.calculateSeverity(answer);
                    const options = question.options || [];
                    const selectedOption = options.find(o => o.value === answer);
                    
                    gaps.push({
                        id: question.id,
                        framework: frameworkCode,
                        frameworkName: assessmentData.name,
                        section: section.name,
                        sectionId: section.id,
                        text: question.text,
                        description: question.description,
                        currentScore: answer || 0,
                        maxScore: 100,
                        severity: severity,
                        selectedOption: selectedOption?.label || 'Not Implemented',
                        selectedDesc: selectedOption?.desc || 'No implementation',
                        expectedControl: question.expected_control || '',
                        helpText: question.help_text || ''
                    });
                }
            });
        });

        return gaps.sort((a, b) => a.currentScore - b.currentScore);
    },

    /**
     * Calculate gap severity based on score
     */
    calculateSeverity: function(score) {
        if (score === undefined || score === 0) return 'High';
        if (score < 25) return 'High';
        if (score < 75) return 'Medium';
        return 'Low';
    },

    /**
     * Render gaps list in the UI
     */
    renderGapsList: function(gaps) {
        const container = document.getElementById('gapsList');
        if (!container) return;
        
        let html = '';
        gaps.forEach((gap, index) => {
            const severityClass = gap.severity === 'High' ? 'danger' : (gap.severity === 'Medium' ? 'warning' : 'info');
            
            html += `
                <div class="card mb-2">
                    <div class="card-body py-2 px-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>${gap.id}</strong>
                                <span class="badge bg-${severityClass} ms-2">${gap.severity}</span>
                                <div class="small text-muted">${gap.section}</div>
                            </div>
                            <div class="text-end">
                                <div class="fw-bold">${gap.currentScore}%</div>
                                <small class="text-muted">Current</small>
                            </div>
                        </div>
                        <div class="mt-2">
                            <strong>${gap.text}</strong>
                        </div>
                        <div class="small text-muted mt-1">
                            Current: ${gap.selectedOption} - ${gap.selectedDesc}
                        </div>
                        ${gap.expectedControl ? `
                            <div class="small mt-2 p-2 bg-light rounded">
                                <strong>Expected:</strong> ${gap.expectedControl}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    /**
     * Show modal for creating tickets
     */
    showCreateTicketsModal: function() {
        if (!this.isConfigured()) {
            if (typeof showNotification === 'function') {
                showNotification('Please configure JIRA settings first', 'warning');
            } else {
                alert('Please configure JIRA settings first');
            }
            this.toggleConfig();
            return;
        }

        const framework = inlineAssessmentState?.currentFramework || window.currentFramework;
        const gaps = this.identifyGaps(framework);
        
        if (gaps.length === 0) {
            if (typeof showNotification === 'function') {
                showNotification('No gaps to create tickets for', 'info');
            } else {
                alert('No gaps to create tickets for');
            }
            return;
        }

        // Populate modal
        document.getElementById('modalProjectKey').textContent = this.config.projectKey;
        document.getElementById('selectedGapsCount').textContent = gaps.length;

        const modalList = document.getElementById('modalGapsList');
        let html = '';
        
        gaps.forEach((gap, index) => {
            html += `
                <div class="list-group-item">
                    <div class="form-check">
                        <input class="form-check-input gap-checkbox" type="checkbox" 
                            id="gap_${index}" value="${index}" checked>
                        <label class="form-check-label" for="gap_${index}">
                            <strong>${gap.id}</strong>: ${gap.text.substring(0, 80)}...
                            <span class="badge bg-${gap.severity === 'High' ? 'danger' : (gap.severity === 'Medium' ? 'warning' : 'info')}">
                                ${gap.severity}
                            </span>
                        </label>
                    </div>
                </div>
            `;
        });

        modalList.innerHTML = html;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('createTicketsModal'));
        modal.show();
    },

    /**
     * Toggle all gap checkboxes
     */
    toggleAllGaps: function(checked) {
        document.querySelectorAll('.gap-checkbox').forEach(cb => {
            cb.checked = checked;
        });
        this.updateSelectedCount();
    },

    /**
     * Update selected gap count display
     */
    updateSelectedCount: function() {
        const count = document.querySelectorAll('.gap-checkbox:checked').length;
        document.getElementById('selectedGapsCount').textContent = count;
    },

    /**
     * Create JIRA tickets for selected gaps
     */
    createTickets: function() {
        const checkboxes = document.querySelectorAll('.gap-checkbox:checked');
        const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.value));
        
        if (selectedIndices.length === 0) {
            if (typeof showNotification === 'function') {
                showNotification('Please select at least one gap', 'warning');
            } else {
                alert('Please select at least one gap');
            }
            return;
        }

        const framework = inlineAssessmentState?.currentFramework || window.currentFramework;
        const gaps = this.identifyGaps(framework);
        const selectedGaps = selectedIndices.map(i => gaps[i]);

        // Close the modal
        const modalEl = document.getElementById('createTicketsModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        // Show progress modal
        this.showProgressModal(selectedGaps);
    },

    /**
     * Show progress modal during ticket creation
     */
    showProgressModal: function(gaps) {
        const modalEl = document.getElementById('jiraProgressModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const progressBar = document.getElementById('jiraProgressBar');
        const progressText = document.getElementById('jiraProgressText');
        const progressLog = document.getElementById('jiraProgressLog');

        progressBar.style.width = '0%';
        progressText.textContent = `Creating ${gaps.length} tickets...`;
        progressLog.innerHTML = '';

        this.createTicketsBatch(gaps, 0, [], modal);
    },

    /**
     * Create tickets in batch with progress tracking
     */
    createTicketsBatch: function(gaps, index, createdTickets, modal) {
        if (index >= gaps.length) {
            // All done
            const progressBar = document.getElementById('jiraProgressBar');
            progressBar.style.width = '100%';
            document.getElementById('jiraProgressText').textContent = 
                `Completed! Created ${createdTickets.length} of ${gaps.length} tickets`;

            // Store created tickets
            this.storeCreatedTickets(createdTickets);

            // Update UI
            setTimeout(() => {
                modal.hide();
                this.showCreatedTicketsList(createdTickets);
                if (typeof showNotification === 'function') {
                    showNotification(`${createdTickets.length} JIRA tickets created successfully!`, 'success');
                } else {
                    alert(`${createdTickets.length} JIRA tickets created successfully!`);
                }
            }, 2000);

            return;
        }

        const gap = gaps[index];
        const progress = Math.round(((index + 1) / gaps.length) * 100);
        
        document.getElementById('jiraProgressBar').style.width = progress + '%';
        document.getElementById('jiraProgressText').textContent = 
            `Creating ticket ${index + 1} of ${gaps.length}: ${gap.id}`;

        // Add log entry
        const logEntry = document.createElement('li');
        logEntry.innerHTML = `<i class="fas fa-spinner fa-spin text-primary"></i> Creating ${gap.id}...`;
        document.getElementById('jiraProgressLog').appendChild(logEntry);

        // Build ticket payload
        const ticketPayload = this.buildTicketPayload(gap);

        // Call backend API
        fetch('/api/jira/create-tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                baseUrl: this.config.baseUrl,
                email: this.config.email,
                apiToken: this.config.apiToken,
                projectKey: this.config.projectKey,
                issueType: this.config.issueType || 'Task',
                tickets: [ticketPayload]
            })
        })
        .then(response => response.json())
        .then(data => {
            logEntry.remove();
            
            if (data.success && data.results?.[0]?.success) {
                const result = data.results[0];
                const ticketInfo = {
                    key: result.ticketKey,
                    url: result.ticketUrl,
                    id: gap.id,
                    summary: ticketPayload.summary
                };
                createdTickets.push(ticketInfo);
                
                const newLog = document.createElement('li');
                newLog.innerHTML = `<i class="fas fa-check text-success"></i> Created <a href="${result.ticketUrl}" target="_blank">${result.ticketKey}</a> for ${gap.id}`;
                document.getElementById('jiraProgressLog').appendChild(newLog);
            } else {
                const errorLog = document.createElement('li');
                errorLog.innerHTML = `<i class="fas fa-times text-danger"></i> Failed to create ${gap.id}: ${data.results?.[0]?.error || 'Unknown error'}`;
                document.getElementById('jiraProgressLog').appendChild(errorLog);
            }
        })
        .catch(error => {
            logEntry.remove();
            const errorLog = document.createElement('li');
            errorLog.innerHTML = `<i class="fas fa-times text-danger"></i> Error creating ${gap.id}: ${error.message}`;
            document.getElementById('jiraProgressLog').appendChild(errorLog);
        })
        .finally(() => {
            // Process next ticket
            this.createTicketsBatch(gaps, index + 1, createdTickets, modal);
        });
    },

    /**
     * Build JIRA ticket payload from gap data
     */
    buildTicketPayload: function(gap) {
        // Build description with detailed information
        let description = `h3. Gap Analysis\n`;
        description += `*Framework:* ${gap.frameworkName}\n`;
        description += `*Section:* ${gap.section}\n`;
        description += `*Control ID:* ${gap.id}\n`;
        description += `*Current Score:* ${gap.currentScore}%\n\n`;
        
        description += `h3. Issue Description\n`;
        description += `${gap.text}\n\n`;
        
        if (gap.description) {
            description += `${gap.description}\n\n`;
        }
        
        description += `h3. Current Status\n`;
        description += `*Level:* ${gap.selectedOption}\n`;
        description += `*Details:* ${gap.selectedDesc}\n\n`;
        
        description += `h3. Required Remediation\n`;
        description += `The control needs to be fully implemented to achieve 100% compliance.\n\n`;
        
        if (gap.expectedControl) {
            description += `h4. Expected Control\n`;
            description += `${gap.expectedControl}\n\n`;
        }
        
        description += `h3. Evidence Required\n`;
        description += `Please provide the following evidence:\n`;
        description += `* Policy documents\n`;
        description += `* Implementation evidence\n`;
        description += `* Audit reports\n`;
        
        if (gap.helpText) {
            description += `\n${gap.helpText}\n`;
        }
        
        description += `\nh3. Implementation Steps\n`;
        description += `Please complete the following steps:\n`;
        description += `* [ ] Review the current gap analysis\n`;
        description += `* [ ] Develop remediation plan\n`;
        description += `* [ ] Implement required controls\n`;
        description += `* [ ] Gather required evidence\n`;
        description += `* [ ] Update assessment with new score`;

        return {
            summary: `[Gap] ${gap.id} - ${gap.frameworkName}: ${gap.text.substring(0, 100)}...`,
            description: description,
            priority: gap.severity
        };
    },

    /**
     * Store created tickets in localStorage
     */
    storeCreatedTickets: function(tickets) {
        try {
            const existing = JSON.parse(localStorage.getItem(this.TICKETS_STORAGE_KEY) || '[]');
            const allTickets = [...existing, ...tickets];
            localStorage.setItem(this.TICKETS_STORAGE_KEY, JSON.stringify(allTickets));
        } catch (e) {
            console.error('Failed to store created tickets:', e);
        }
    },

    /**
     * Show list of created tickets
     */
    showCreatedTicketsList: function(tickets) {
        const section = document.getElementById('jiraTicketsSection');
        const list = document.getElementById('createdTicketsList');
        
        if (!section || !list) return;
        
        section.style.display = 'block';
        
        let html = '';
        tickets.forEach(ticket => {
            html += `
                <a href="${ticket.url}" target="_blank" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                        <strong>${ticket.key}</strong>
                        <small>Just now</small>
                    </div>
                    <small class="text-muted">${ticket.id}</small>
                </a>
            `;
        });
        
        list.innerHTML = html;
        
        // Scroll to section
        section.scrollIntoView({ behavior: 'smooth' });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Delay initialization to ensure frameworkAssessments is loaded
    setTimeout(() => {
        if (window.JIRAIntegration) {
            window.JIRAIntegration.init();
        }
    }, 1500);
});
