// Function to fetch user profile data from GraphQL API
async function fetchUserProfile() {
    // GraphQL query to get user data, transactions, and skills
    const query = `{
        // Get basic user information
        user {
            id
            login
            totalUp     // Total audit points given to others
            totalDown   // Total audit points received from others
            attrs      // User attributes like name, email
        }
        // Get total XP from module transactions
        // Excludes JS piscine XP to show only main curriculum progress
        transaction_aggregate(
            where: {
                _and: [
                    { type: { _eq: "xp" } },
                    { path: { _like: "/bahrain/bh-module/%" } },
                    { path: { _nlike: "/bahrain/bh-module/piscine-js/%"} }
                ]
            }
        ) {
            aggregate {
                sum {
                    amount
                }
            }
        }
        // Get user's skill progression data
        // Retrieves distinct skill types and their highest amounts
        progressionSkill:user {
            transactions(
                where: {type: {_like: "skill_%"}}
                distinct_on: type
                order_by: [{type: asc}, {amount: desc}]
            ) {
                type
                amount
            }
        }
        // Get recent project completions
        // Excludes checkpoints and JS piscine projects
        recentProj:transaction(
            where: {
                type: { _eq: "xp" }
                _and: [
                    { path: { _like: "/bahrain/bh-module%" } },
                    { path: { _nlike: "/bahrain/bh-module/checkpoint%" } },
                    { path: { _nlike: "/bahrain/bh-module/piscine-js%" } }
                ]
            }
            order_by: { createdAt: desc }
            limit: 5
        ) {
            object {
                type
                name
            }
        }
    }`;

    try {
        // Get JWT token from session storage
        const token = sessionStorage.getItem('jwt');
        if (!token) {
            // Redirect to login if no token found
            window.location.href = 'login.html';
            return;
        }

        // Fetch user data from GraphQL API
        const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch profile data');
        }

        const result = await response.json();
        const data = result.data;

        // Verify user data exists
        if (!data || !data.user || !data.user[0]) {
            throw new Error('Unauthorized');
        }

        // Display user data on the page
        await displayUserData(data);

        // Fetch recent audit history
        // This separate query gets the latest 5 audits performed by the user
        const auditQuery = `{
            audit(
                where: {
                    auditor: {id: {_eq:${data.user[0].id}}},
                    private: { code: { _is_null: false }}
                },
                order_by: {id: desc},
                limit: 5
            ) {
                createdAt
                group {
                    path
                    captain {
                        login
                    }
                }
                private {
                    code
                }
            }
        }`;

        // Fetch audit data from GraphQL API
        const auditResponse = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: auditQuery })
        });

        if (!auditResponse.ok) {
            throw new Error('Failed to fetch audit data');
        }

        const auditResult = await auditResponse.json();
        if (auditResult.data) {
            // Display audit history on the page
            displayAuditHistory(auditResult.data.audit);
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        window.location.href = 'login.html';
    }
}

// Extract and process top skills from user data
// This function aggregates skill amounts by type and returns the top 6 skills
function getTopSkills(skills) {
    if (!Array.isArray(skills)) {
        console.error("Expected an array of skills.");
        return [];
    }
    // Aggregate skill amounts by type
    const topSkills = skills.reduce((acc, skill) => {
        if (typeof skill === 'object' && skill !== null && 'type' in skill && 'amount' in skill) {
            // Extract skill name from type (remove 'skill_' prefix)
            const skillType = skill.type.split("_")[1];
            if (typeof skillType === 'string' && !isNaN(skill.amount)) {
                // Sum up amounts for each skill type
                if (acc[skillType]) {
                    acc[skillType] += skill.amount;
                } else {
                    acc[skillType] = skill.amount;
                }
            }
        }
        return acc;
    }, {});

    // Sort skills by amount and take top 6
    const sortedSkills = Object.entries(topSkills).sort((a, b) => b[1] - a[1]);
    return sortedSkills
        .slice(0, Math.min(6, sortedSkills.length))
        .map(([name, amount]) => ({ name, amount }));
}

// Display user data on the profile page
async function displayUserData(data) {
    if (!data || !data.user || !data.user[0]) {
        console.error('Invalid data structure:', data);
        return;
    }

    const user = data.user[0];
    const userSkills = data.progressionSkill[0]?.transactions || [];

    // Update user info section with name and login
    document.getElementById('user-info').innerHTML = `
        <h2>Welcome, ${user.attrs.firstName || ''} ${user.attrs.lastName || ''} (${user.login})!</h2>
    `;

    // Calculate and format total XP
    // Converts XP to KB/MB format for better readability
    if (data.transaction_aggregate.aggregate.sum.amount != null) {
        const amount = data.transaction_aggregate.aggregate.sum.amount;
        const inKB = amount / 1000; // Convert to KB
        if (inKB >= 1000) {
            document.getElementById('xp-total').textContent = (inKB / 1000).toFixed(1) + " MB";
        } else {
            document.getElementById('xp-total').textContent = inKB.toFixed(0) + " KB";
        }
    } else {
        document.getElementById('xp-total').textContent = "0 KB";
    }

    // Process and display skills data
    const skillnameAndAmount = getTopSkills(userSkills);
    let arr = [];    // Array to store skill names
    let arrvalues = []; // Array to store skill values

    // Process each skill for display
    for (let i = 0; i < skillnameAndAmount.length; i++) {
        if (skillnameAndAmount[i].name.length >= 2) {
            // Capitalize first letter of skill name
            const capitalizedSkillName = skillnameAndAmount[i].name.charAt(0).toUpperCase() + 
                                          skillnameAndAmount[i].name.slice(1);
            arr.push(capitalizedSkillName);
            arrvalues.push(skillnameAndAmount[i].amount);
        }
    }

    // Scale skill values to 5-point scale and draw radar chart
    arrvalues = arrvalues.map(value => (value / 100) * 5);
    drawSvgRadar(arr, arrvalues);

    // Calculate and display audit ratio
    const upAudit = user.totalUp / 1000;
    const downAudit = user.totalDown / 1000;
    createAuditRatioGraph(upAudit, downAudit);
    document.getElementById('ratio-value').textContent = 
        `${(upAudit / downAudit).toFixed(1)} Almost perfect!`;

    // Display recent projects
    const projectRecents = document.getElementById('ProjectRecents');
    projectRecents.innerHTML = '';

    if (data.recentProj && data.recentProj.length > 0) {
        data.recentProj.forEach((proj, index) => {
            const recentProject = document.createElement('div');
            recentProject.textContent = `${index + 1}. ${proj.object.name}`;
            projectRecents.appendChild(recentProject);
        });
    } else {
        const noProjects = document.createElement('div');
        noProjects.textContent = 'No recent projects';
        projectRecents.appendChild(noProjects);
    }
}

// Display audit history on the profile page
function displayAuditHistory(auditData) {
    const auditHistory = document.getElementById('auditHistory');
    auditHistory.innerHTML = '';

    auditData.forEach(audit => {
        // Create audit item row
        const row = document.createElement('div');
        row.className = 'audit-item';

        // Extract project name from path
        const pathParts = audit.group.path.split('/');
        const projectName = pathParts[pathParts.length - 1];

        // Create audit information text
        const auditInfo = document.createElement('div');
        auditInfo.textContent = `${audit.group.captain.login} - ${projectName}`;
        row.appendChild(auditInfo);

        // Add pass status (all audits with non-null code are passes)
        const statusDiv = document.createElement('div');
        statusDiv.className = 'status-pass';
        statusDiv.textContent = 'Pass';
        row.appendChild(statusDiv);

        auditHistory.appendChild(row);
    });
}

// Draw the radar chart for skills visualization
function drawSvgRadar(nameData, Pointdata) {
    // Initialize SVG container and clear existing content
    const container = document.getElementById('skills-graph');
    container.innerHTML = '';

    // Set dimensions and calculate center point
    const width = container.clientWidth;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.6; // Use 60% of minimum dimension for radius

    // Create main SVG element with viewBox for responsiveness
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Create 10 concentric circles for the grid
    const gridLevels = 10;
    for (let i = 1; i <= gridLevels; i++) {
        const gridCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        gridCircle.setAttribute('cx', centerX);
        gridCircle.setAttribute('cy', centerY);
        gridCircle.setAttribute('r', (radius * i) / gridLevels);
        gridCircle.setAttribute('class', 'grid-line');
        svg.appendChild(gridCircle);
    }

    const categories = nameData;
    const numCategories = categories.length;
    // Calculate angle slice for evenly distributing categories
    const angleSlice = (Math.PI * 2) / numCategories;

    // Draw axis lines and labels for each category
    categories.forEach((category, i) => {
        const angle = i * angleSlice - Math.PI / 2; // Start from top (-90 degrees)

        // Draw axis line
        const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axis.setAttribute('x1', centerX);
        axis.setAttribute('y1', centerY);
        axis.setAttribute('x2', centerX + radius * Math.cos(angle));
        axis.setAttribute('y2', centerY + radius * Math.sin(angle));
        axis.setAttribute('class', 'grid-line');
        svg.appendChild(axis);

        // Add category label
        const labelRadius = radius + 20; // Position labels slightly outside the chart
        const labelX = centerX + labelRadius * Math.cos(angle);
        const labelY = centerY + labelRadius * Math.sin(angle);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = category;
        svg.appendChild(text);
    });

    // Calculate points for the skill polygon
    const points = Pointdata.map((value, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const distance = value * (radius / 5); // Scale to match the 5-point scale
        return {
            x: centerX + distance * Math.cos(angle),
            y: centerY + distance * Math.sin(angle)
        };
    });

    // Create and add the skill polygon
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
    polygon.setAttribute('class', 'skill-polygon');
    svg.appendChild(polygon);

    // Add points at vertices for better visibility
    points.forEach(point => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 4);
        circle.setAttribute('class', 'skill-point');
        svg.appendChild(circle);
    });

    container.appendChild(svg);
}

// Create a bar graph showing audit ratio comparison
function createAuditRatioGraph(auditDone, auditReceived) {
    // Initialize SVG container and clear existing content
    const container = document.getElementById('audit-ratio-graph');
    container.innerHTML = '';

    // Set dimensions for the graph
    const width = container.clientWidth;
    const height = 120;
    const barHeight = 30;
    const spacing = 20;

    // Create main SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    // Center the bars vertically in the container
    const startY = (height - (2 * barHeight + spacing)) / 2;

    // Format values for display (KB to MB conversion if needed)
    let doneMB = auditDone;
    let receivedMB = auditReceived;
    let doneLabel, receivedLabel;

    // Format "Done" audits value
    if (auditDone >= 1000) {
        doneMB = (auditDone / 1000).toFixed(2);
        doneLabel = `${doneMB} MB`;
    } else {
        doneLabel = `${auditDone.toFixed(0)} KB`;
    }

    // Format "Received" audits value
    if (auditReceived >= 1000) {
        receivedMB = (auditReceived / 1000).toFixed(2);
        receivedLabel = `${receivedMB} MB`;
    } else {
        receivedLabel = `${auditReceived.toFixed(0)} KB`;
    }

    // Calculate relative widths for the bars
    const maxValue = Math.max(auditDone, auditReceived);
    const scale = (width - 100) / maxValue; // Leave space for labels

    // Create and add "Done" audits bar
    const doneWidth = auditDone * scale;
    const doneBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    doneBar.setAttribute('x', 0);
    doneBar.setAttribute('y', startY);
    doneBar.setAttribute('width', doneWidth);
    doneBar.setAttribute('height', barHeight);
    doneBar.setAttribute('class', 'done-bar');
    doneBar.setAttribute('rx', 4);
    doneBar.setAttribute('ry', 4);

    // Add "Done" label with arrow
    const doneText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    doneText.setAttribute('x', doneWidth + 10);
    doneText.setAttribute('y', startY + barHeight / 2);
    doneText.setAttribute('dominant-baseline', 'middle');
    doneText.textContent = `${doneLabel} ↑`;

    // Create and add "Received" audits bar
    const receivedWidth = auditReceived * scale;
    const receivedBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    receivedBar.setAttribute('x', 0);
    receivedBar.setAttribute('y', startY + barHeight + spacing);
    receivedBar.setAttribute('width', receivedWidth);
    receivedBar.setAttribute('height', barHeight);
    receivedBar.setAttribute('class', 'received-bar');
    receivedBar.setAttribute('rx', 4);
    receivedBar.setAttribute('ry', 4);

    // Add "Received" label with arrow
    const receivedText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    receivedText.setAttribute('x', receivedWidth + 10);
    receivedText.setAttribute('y', startY + barHeight + spacing + barHeight / 2);
    receivedText.setAttribute('dominant-baseline', 'middle');
    receivedText.textContent = `${receivedLabel} ↓`;

    // Append all elements to the SVG
    svg.appendChild(doneBar);
    svg.appendChild(receivedBar);
    svg.appendChild(doneText);
    svg.appendChild(receivedText);

    container.appendChild(svg);
}

// Initialize page and add event listeners
document.addEventListener('DOMContentLoaded', checkAuth);
document.getElementById('logoutBtn').addEventListener('click', logout);

// Handle browser navigation
window.onpopstate = function(event) {
    const token = sessionStorage.getItem('jwt');
    if (!token) {
        window.location.href = 'login.html';
    }
};

// Check authentication status
function checkAuth() {
    const token = sessionStorage.getItem('jwt');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    fetchUserProfile();
}

// Logout functionality
function logout() {
    // Clear session storage
    sessionStorage.removeItem('jwt');
    sessionStorage.clear();
    // Clear all cookies
    document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + 
            new Date().toUTCString() + ";path=/");
    });
    // Redirect to login page
    window.location.href = 'login.html';
}