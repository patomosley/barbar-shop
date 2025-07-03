// Estado global da aplicação
const AppState = {
    currentUser: null,
    currentScreen: 'login',
    currentSection: 'dashboard',
    services: [],
    appointments: [],
    clients: [],
    workSchedule: []
};

// Utilitários
const Utils = {
    // Fazer requisições HTTP
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        };

        const config = { ...defaultOptions, ...options };
        
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    },

    // Mostrar loading
    showLoading() {
        document.getElementById('loading').classList.add('active');
    },

    // Esconder loading
    hideLoading() {
        document.getElementById('loading').classList.remove('active');
    },

    // Mostrar toast
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type} active`;
        
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    },

    // Formatar moeda
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    // Formatar data
    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    },

    // Formatar horário
    formatTime(timeString) {
        return timeString;
    }
};

// Gerenciador de telas
const ScreenManager = {
    showScreen(screenId) {
        // Esconder todas as telas
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Mostrar tela específica
        document.getElementById(screenId).classList.add('active');
        AppState.currentScreen = screenId;
    },

    showSection(sectionId) {
        // Esconder todas as seções
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar seção específica
        document.getElementById(sectionId + 'Section').classList.add('active');
        
        // Atualizar navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
        
        // Atualizar título
        const titles = {
            dashboard: 'Dashboard',
            appointments: 'Agendamentos',
            clients: 'Clientes',
            services: 'Serviços',
            schedule: 'Horários de Funcionamento',
            finance: 'Relatórios Financeiros'
        };
        document.getElementById('sectionTitle').textContent = titles[sectionId];
        
        AppState.currentSection = sectionId;
        
        // Carregar dados da seção
        this.loadSectionData(sectionId);
    },

    async loadSectionData(sectionId) {
        switch (sectionId) {
            case 'dashboard':
                await Dashboard.load();
                break;
            case 'appointments':
                await Appointments.load();
                break;
            case 'clients':
                await Clients.load();
                break;
            case 'services':
                await Services.load();
                break;
            case 'schedule':
                await Schedule.load();
                break;
            case 'finance':
                await Finance.load();
                break;
        }
    }
};

// Autenticação
const Auth = {
    async login(username, password) {
        try {
            Utils.showLoading();
            const response = await Utils.request('/api/login', {
                method: 'POST',
                body: { username, password }
            });
            
            AppState.currentUser = response.user;
            
            if (response.user.role === 'admin') {
                ScreenManager.showScreen('adminScreen');
                document.getElementById('userWelcome').textContent = `Bem-vindo, ${response.user.name || response.user.username}!`;
                ScreenManager.showSection('dashboard');
            } else {
                Utils.showToast('Acesso negado. Apenas administradores podem acessar.', 'error');
            }
            
            Utils.showToast('Login realizado com sucesso!');
        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    async logout() {
        try {
            await Utils.request('/api/logout', { method: 'POST' });
            AppState.currentUser = null;
            ScreenManager.showScreen('loginScreen');
            Utils.showToast('Logout realizado com sucesso!');
        } catch (error) {
            Utils.showToast(error.message, 'error');
        }
    },

    async checkAuth() {
        try {
            const response = await Utils.request('/api/me');
            AppState.currentUser = response.user;
            
            if (response.user.role === 'admin') {
                ScreenManager.showScreen('adminScreen');
                document.getElementById('userWelcome').textContent = `Bem-vindo, ${response.user.name || response.user.username}!`;
                ScreenManager.showSection('dashboard');
            }
        } catch (error) {
            // Usuário não autenticado
            ScreenManager.showScreen('loginScreen');
        }
    }
};

// Dashboard
const Dashboard = {
    async load() {
        try {
            Utils.showLoading();
            
            // Carregar resumo financeiro
            const summary = await Utils.request('/api/finance/summary');
            
            // Atualizar cards de estatísticas
            document.getElementById('todayAppointments').textContent = summary.today.appointments;
            document.getElementById('todayRevenue').textContent = Utils.formatCurrency(summary.today.revenue);
            document.getElementById('pendingAppointments').textContent = summary.today.pending;
            document.getElementById('monthRevenue').textContent = Utils.formatCurrency(summary.month.revenue);
            
            // Carregar agendamentos de hoje
            const todayAppointments = await Utils.request('/api/appointments/today');
            this.renderTodayAppointments(todayAppointments.appointments);
            
        } catch (error) {
            Utils.showToast('Erro ao carregar dashboard: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    renderTodayAppointments(appointments) {
        const container = document.getElementById('todayAppointmentsList');
        
        if (appointments.length === 0) {
            container.innerHTML = '<p>Nenhum agendamento para hoje.</p>';
            return;
        }
        
        container.innerHTML = appointments.map(appointment => `
            <div class="appointment-item">
                <div class="appointment-info">
                    <h4>${appointment.client_name}</h4>
                    <p>${appointment.service_name} - ${Utils.formatTime(appointment.time)}</p>
                    <p>Tel: ${appointment.client_phone}</p>
                </div>
                <div class="appointment-actions">
                    <span class="appointment-status status-${appointment.status}">${this.getStatusText(appointment.status)}</span>
                    ${appointment.status === 'pending' ? `
                        <button onclick="Appointments.updateStatus(${appointment.id}, 'confirmed')" class="btn btn-success btn-sm">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    },

    getStatusText(status) {
        const statusMap = {
            pending: 'Pendente',
            confirmed: 'Confirmado',
            completed: 'Concluído',
            cancelled: 'Cancelado'
        };
        return statusMap[status] || status;
    }
};

// Agendamentos
const Appointments = {
    async load() {
        try {
            Utils.showLoading();
            const response = await Utils.request('/api/appointments');
            AppState.appointments = response.appointments;
            this.render();
        } catch (error) {
            Utils.showToast('Erro ao carregar agendamentos: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    render() {
        const container = document.getElementById('appointmentsTable');
        
        if (AppState.appointments.length === 0) {
            container.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Serviço</th>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.appointments.map(appointment => `
                        <tr>
                            <td>
                                <strong>${appointment.client_name}</strong><br>
                                <small>${appointment.client_phone}</small>
                            </td>
                            <td>
                                ${appointment.service_name}<br>
                                <small>${Utils.formatCurrency(appointment.service_price)}</small>
                            </td>
                            <td>${Utils.formatDate(appointment.date)}</td>
                            <td>${Utils.formatTime(appointment.time)}</td>
                            <td>
                                <span class="appointment-status status-${appointment.status}">
                                    ${Dashboard.getStatusText(appointment.status)}
                                </span>
                            </td>
                            <td>
                                <select onchange="Appointments.updateStatus(${appointment.id}, this.value)" class="form-control">
                                    <option value="pending" ${appointment.status === 'pending' ? 'selected' : ''}>Pendente</option>
                                    <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>Confirmado</option>
                                    <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Concluído</option>
                                    <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                                </select>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    async updateStatus(appointmentId, newStatus) {
        try {
            await Utils.request(`/api/appointments/${appointmentId}/status`, {
                method: 'PUT',
                body: { status: newStatus }
            });
            
            Utils.showToast('Status atualizado com sucesso!');
            await this.load();
            
            // Atualizar dashboard se estiver visível
            if (AppState.currentSection === 'dashboard') {
                await Dashboard.load();
            }
        } catch (error) {
            Utils.showToast('Erro ao atualizar status: ' + error.message, 'error');
        }
    }
};

// Clientes
const Clients = {
    async load() {
        try {
            Utils.showLoading();
            const response = await Utils.request('/api/users');
            AppState.clients = response.users.filter(user => user.role === 'client');
            this.render();
        } catch (error) {
            Utils.showToast('Erro ao carregar clientes: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    render() {
        const container = document.getElementById('clientsTable');
        
        if (AppState.clients.length === 0) {
            container.innerHTML = '<p>Nenhum cliente encontrado.</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Telefone</th>
                        <th>Email</th>
                        <th>Username</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.clients.map(client => `
                        <tr>
                            <td>${client.name || '-'}</td>
                            <td>${client.phone || '-'}</td>
                            <td>${client.email || '-'}</td>
                            <td>${client.username}</td>
                            <td>
                                <button onclick="Clients.edit(${client.id})" class="btn btn-primary btn-sm">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="Clients.delete(${client.id})" class="btn btn-danger btn-sm">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    edit(clientId) {
        // Implementar edição de cliente
        Utils.showToast('Funcionalidade em desenvolvimento', 'info');
    },

    async delete(clientId) {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) {
            return;
        }
        
        try {
            await Utils.request(`/api/users/${clientId}`, { method: 'DELETE' });
            Utils.showToast('Cliente excluído com sucesso!');
            await this.load();
        } catch (error) {
            Utils.showToast('Erro ao excluir cliente: ' + error.message, 'error');
        }
    }
};

// Serviços
const Services = {
    async load() {
        try {
            Utils.showLoading();
            const response = await Utils.request('/api/services');
            AppState.services = response.services;
            this.render();
        } catch (error) {
            Utils.showToast('Erro ao carregar serviços: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    render() {
        const container = document.getElementById('servicesTable');
        
        if (AppState.services.length === 0) {
            container.innerHTML = '<p>Nenhum serviço encontrado.</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Duração</th>
                        <th>Preço</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.services.map(service => `
                        <tr>
                            <td>${service.name}</td>
                            <td>${service.duration} min</td>
                            <td>${Utils.formatCurrency(service.price)}</td>
                            <td>
                                <button onclick="Services.edit(${service.id})" class="btn btn-primary btn-sm">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="Services.delete(${service.id})" class="btn btn-danger btn-sm">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    edit(serviceId) {
        // Implementar edição de serviço
        Utils.showToast('Funcionalidade em desenvolvimento', 'info');
    },

    async delete(serviceId) {
        if (!confirm('Tem certeza que deseja excluir este serviço?')) {
            return;
        }
        
        try {
            await Utils.request(`/api/services/${serviceId}`, { method: 'DELETE' });
            Utils.showToast('Serviço excluído com sucesso!');
            await this.load();
        } catch (error) {
            Utils.showToast('Erro ao excluir serviço: ' + error.message, 'error');
        }
    }
};

// Horários
const Schedule = {
    async load() {
        try {
            Utils.showLoading();
            const response = await Utils.request('/api/work_schedule');
            AppState.workSchedule = response.work_schedule;
            this.render();
        } catch (error) {
            Utils.showToast('Erro ao carregar horários: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    render() {
        const container = document.getElementById('scheduleForm');
        const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
        
        container.innerHTML = days.map((day, index) => {
            const schedule = AppState.workSchedule.find(s => s.day_of_week === index);
            return `
                <div class="schedule-day">
                    <label>${day}:</label>
                    <input type="time" id="start_${index}" value="${schedule ? schedule.start_time : '08:00'}" class="form-control">
                    <span>até</span>
                    <input type="time" id="end_${index}" value="${schedule ? schedule.end_time : '18:00'}" class="form-control">
                    <label>
                        <input type="checkbox" id="extended_${index}" ${schedule && schedule.is_extended ? 'checked' : ''}>
                        Horário estendido
                    </label>
                </div>
            `;
        }).join('');
    },

    async save() {
        try {
            Utils.showLoading();
            
            const scheduleData = [];
            for (let i = 0; i < 7; i++) {
                const startTime = document.getElementById(`start_${i}`).value;
                const endTime = document.getElementById(`end_${i}`).value;
                const isExtended = document.getElementById(`extended_${i}`).checked;
                
                if (startTime && endTime) {
                    scheduleData.push({
                        day_of_week: i,
                        start_time: startTime,
                        end_time: endTime,
                        is_extended: isExtended
                    });
                }
            }
            
            await Utils.request('/api/work_schedule', {
                method: 'POST',
                body: scheduleData
            });
            
            Utils.showToast('Horários salvos com sucesso!');
            await this.load();
        } catch (error) {
            Utils.showToast('Erro ao salvar horários: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Financeiro
const Finance = {
    async load() {
        try {
            Utils.showLoading();
            await this.generateReport();
        } catch (error) {
            Utils.showToast('Erro ao carregar relatório financeiro: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    async generateReport() {
        const type = document.getElementById('financeType').value;
        const date = document.getElementById('financeDate').value || new Date().toISOString().split('T')[0];
        
        try {
            let url = `/api/finance/${type}`;
            const params = new URLSearchParams();
            
            if (type === 'daily') {
                params.append('date', date);
            } else if (type === 'monthly') {
                const [year, month] = date.split('-');
                params.append('year', year);
                params.append('month', month);
            } else if (type === 'annual') {
                const year = date.split('-')[0];
                params.append('year', year);
            }
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            const response = await Utils.request(url);
            this.renderReport(response, type);
        } catch (error) {
            Utils.showToast('Erro ao gerar relatório: ' + error.message, 'error');
        }
    },

    renderReport(data, type) {
        const container = document.getElementById('financeReport');
        
        let title = '';
        let period = '';
        
        switch (type) {
            case 'daily':
                title = 'Relatório Diário';
                period = Utils.formatDate(data.date);
                break;
            case 'monthly':
                title = 'Relatório Mensal';
                period = `${data.month}/${data.year}`;
                break;
            case 'annual':
                title = 'Relatório Anual';
                period = data.year;
                break;
        }
        
        container.innerHTML = `
            <h4>${title} - ${period}</h4>
            <div class="finance-summary">
                <div class="finance-item">
                    <h4>${Utils.formatCurrency(data.total_revenue)}</h4>
                    <p>Receita Total</p>
                </div>
                <div class="finance-item">
                    <h4>${data.total_appointments}</h4>
                    <p>Total de Agendamentos</p>
                </div>
            </div>
            
            ${data.services_count && Object.keys(data.services_count).length > 0 ? `
                <h5>Serviços Mais Procurados</h5>
                <div class="services-stats">
                    ${Object.entries(data.services_count).map(([service, count]) => `
                        <div class="service-stat">
                            <strong>${service}:</strong> ${count} agendamentos
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }
};

// Área do Cliente
const ClientArea = {
    async loadServices() {
        try {
            const response = await Utils.request('/api/services');
            const select = document.getElementById('serviceSelect');
            
            select.innerHTML = '<option value="">Selecione um serviço</option>';
            response.services.forEach(service => {
                select.innerHTML += `<option value="${service.id}">${service.name} - ${Utils.formatCurrency(service.price)} (${service.duration}min)</option>`;
            });
        } catch (error) {
            Utils.showToast('Erro ao carregar serviços: ' + error.message, 'error');
        }
    },

    async loadAvailableTimes() {
        const date = document.getElementById('appointmentDate').value;
        const serviceId = document.getElementById('serviceSelect').value;
        
        if (!date || !serviceId) return;
        
        try {
            const response = await Utils.request(`/api/appointments/available-times?date=${date}&service_id=${serviceId}`);
            const select = document.getElementById('appointmentTime');
            
            select.innerHTML = '<option value="">Selecione um horário</option>';
            response.available_times.forEach(time => {
                select.innerHTML += `<option value="${time}">${Utils.formatTime(time)}</option>`;
            });
        } catch (error) {
            Utils.showToast('Erro ao carregar horários: ' + error.message, 'error');
        }
    },

    async createAppointment(formData) {
        try {
            Utils.showLoading();
            
            const appointmentData = {
                client_name: formData.get('clientName'),
                client_phone: formData.get('clientPhone'),
                client_email: formData.get('clientEmail'),
                service_id: parseInt(formData.get('serviceSelect')),
                date: formData.get('appointmentDate'),
                time: formData.get('appointmentTime')
            };
            
            await Utils.request('/api/appointments', {
                method: 'POST',
                body: appointmentData
            });
            
            Utils.showToast('Agendamento criado com sucesso!');
            document.getElementById('appointmentForm').reset();
        } catch (error) {
            Utils.showToast('Erro ao criar agendamento: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Event Listeners
    
    // Login
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        Auth.login(formData.get('username'), formData.get('password'));
    });
    
    // Navegação
    document.getElementById('clientAccessBtn').addEventListener('click', function(e) {
        e.preventDefault();
        ScreenManager.showScreen('clientScreen');
        ClientArea.loadServices();
    });
    
    document.getElementById('backToLoginBtn').addEventListener('click', function() {
        ScreenManager.showScreen('loginScreen');
    });
    
    document.getElementById('logoutBtn').addEventListener('click', function() {
        Auth.logout();
    });
    
    // Navegação admin
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            ScreenManager.showSection(section);
        });
    });
    
    // Agendamento cliente
    document.getElementById('appointmentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        ClientArea.createAppointment(formData);
    });
    
    // Mudança de data/serviço para carregar horários
    document.getElementById('appointmentDate').addEventListener('change', ClientArea.loadAvailableTimes);
    document.getElementById('serviceSelect').addEventListener('change', ClientArea.loadAvailableTimes);
    
    // Botões de ação
    document.getElementById('refreshAppointments').addEventListener('click', () => Appointments.load());
    document.getElementById('saveScheduleBtn').addEventListener('click', () => Schedule.save());
    document.getElementById('generateReportBtn').addEventListener('click', () => Finance.generateReport());
    
    // Modal
    document.querySelector('.modal-close').addEventListener('click', function() {
        document.getElementById('modal').classList.remove('active');
    });
    
    // Verificar autenticação inicial
    Auth.checkAuth();
    
    // Configurar data mínima para hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').setAttribute('min', today);
    document.getElementById('financeDate').value = today;
});

