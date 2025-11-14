// Use environment variable or fallback to localhost for development
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
	const url = `${API_BASE_URL}${endpoint}`;
	const config = {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	};

	// Handle body serialization
	if (options.body && typeof options.body === "object") {
		config.body = JSON.stringify(options.body);
	}

	try {
		const response = await fetch(url, config);

		// Handle empty responses (204 No Content)
		if (response.status === 204) {
			return null;
		}

		const data = await response.json().catch(() => null);

		if (!response.ok) {
			const errorMessage =
				data?.message ||
				data?.error ||
				data?.errorMessage ||
				`HTTP error! status: ${response.status}`;
			const error = new Error(errorMessage);
			error.status = response.status;
			error.response = { data };
			throw error;
		}

		return data;
	} catch (error) {
		console.error(`API Error: ${endpoint}`, error);
		throw error;
	}
}

// User API
export const userAPI = {
	getAll: () => apiCall("/users"),
	getById: (id) => apiCall(`/users/${id}`),
	getByEmail: (email) => apiCall(`/users/email/${encodeURIComponent(email)}`),
	create: (user) => apiCall("/users", { method: "POST", body: user }),
	update: (id, user) => apiCall(`/users/${id}`, { method: "PUT", body: user }),
	delete: (id) => apiCall(`/users/${id}`, { method: "DELETE" }),
};

// Admin API
export const adminAPI = {
	// Patients
	getPatients: () => apiCall("/admin/patients"),
	getPatientById: (id) => apiCall(`/admin/patients/${id}`),
	getPatientByEmail: (email) =>
		apiCall(`/admin/patients/email/${encodeURIComponent(email)}`),
	createPatient: (patient) =>
		apiCall("/admin/patients", { method: "POST", body: patient }),
	updatePatient: (id, patient) =>
		apiCall(`/admin/patients/${id}`, { method: "PUT", body: patient }),
	deletePatient: (id) => apiCall(`/admin/patients/${id}`, { method: "DELETE" }),

	// Staff
	getStaff: () => apiCall("/admin/staff"),
	getStaffById: (id) => apiCall(`/admin/staff/${id}`),
	getStaffByEmail: (email) =>
		apiCall(`/admin/staff/email/${encodeURIComponent(email)}`),
	createStaff: (staff) =>
		apiCall("/admin/staff", { method: "POST", body: staff }),
	updateStaff: (id, staff) =>
		apiCall(`/admin/staff/${id}`, { method: "PUT", body: staff }),
	deleteStaff: (id) => apiCall(`/admin/staff/${id}`, { method: "DELETE" }),
};

// Appointment API
export const appointmentAPI = {
	getAll: () => apiCall("/appointments"),
	getById: (id) => apiCall(`/appointments/${id}`),
	getByPatientId: (patientId) => apiCall(`/appointments/patient/${patientId}`),
	getByClinicId: (clinicId) => apiCall(`/appointments/clinic/${clinicId}`),
	getByDoctorId: (doctorId) => apiCall(`/appointments/doctor/${doctorId}`),
	getByStatus: (status) => apiCall(`/appointments/status/${status}`),
	create: (appointment) =>
		apiCall("/appointments", { method: "POST", body: appointment }),
	update: (id, appointment) =>
		apiCall(`/appointments/${id}`, { method: "PUT", body: appointment }),
	updateStatus: (id, status) =>
		apiCall(`/appointments/${id}/status`, { method: "PATCH", body: { status } }),
	delete: (id) => apiCall(`/appointments/${id}`, { method: "DELETE" }),
};

// Queue API
export const queueAPI = {
	checkIn: (appointmentId, priority = 1) =>
		apiCall(
			`/queue/check-in?appointmentId=${appointmentId}&priority=${priority}`,
			{
				method: "POST",
			}
		),
	getClinicQueue: (clinicId) => apiCall(`/queue/clinic/${clinicId}`),
	getQueuePosition: (appointmentId) =>
		apiCall(`/queue/position/${appointmentId}`),
	// SSE connection for real-time queue position updates
	streamQueuePosition: (appointmentId, onUpdate, onError) => {
		const eventSource = new EventSource(
			`${API_BASE_URL}/queue/position/${appointmentId}/stream`
		);

		eventSource.addEventListener("queue-update", (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.error) {
					onError?.(new Error(data.error));
				} else {
					onUpdate(data);
				}
			} catch (err) {
				onError?.(err);
			}
		});

		eventSource.onerror = (error) => {
			onError?.(error);
			eventSource.close();
		};

		return eventSource;
	},
	updateStatus: (queueId, status) =>
		apiCall(`/queue/${queueId}/status`, {
			method: "PATCH",
			body: { status },
		}),
	requeue: (appointmentId, priority = 1) =>
		apiCall(`/queue/requeue/${appointmentId}`, {
			method: "POST",
			body: { priority },
		}),
	getAppointmentHistory: (appointmentId) =>
		apiCall(`/queue/appointment/${appointmentId}`),
	getCurrentlyServing: (clinicId) =>
		apiCall(`/queue/clinic/${clinicId}/currently-serving`),
	getMissed: (clinicId) => apiCall(`/queue/clinic/${clinicId}/missed`),
	callNext: (clinicId) =>
		apiCall(`/queue/clinic/${clinicId}/call-next`, { method: "POST" }),
	callByAppointmentId: (appointmentId) =>
		apiCall(`/queue/call-appointment/${appointmentId}`, { method: "POST" }),
	markAppointmentDone: (appointmentId) =>
		apiCall(`/queue/appointment/${appointmentId}/done`, { method: "POST" }),
};

// Clinic API
export const clinicAPI = {
	getAll: () => apiCall("/clinics"),
	getById: (id) => apiCall(`/clinics/${id}`),
	getByRegion: (region) =>
		apiCall(`/clinics/region/${encodeURIComponent(region)}`),
	getByArea: (area) => apiCall(`/clinics/area/${encodeURIComponent(area)}`),
	getBySpecialty: (specialty) =>
		apiCall(`/clinics/specialty/${encodeURIComponent(specialty)}`),
	getByType: (type) =>
		apiCall(`/clinics/type?clinicType=${encodeURIComponent(type)}`),
	create: (clinic) => apiCall("/clinics", { method: "POST", body: clinic }),
	update: (id, clinic) =>
		apiCall(`/clinics/${id}`, { method: "PUT", body: clinic }),
	delete: (id) => apiCall(`/clinics/${id}`, { method: "DELETE" }),
};

// Doctor API
export const doctorAPI = {
	getAll: () => apiCall("/doctors"),
	getById: (id) => apiCall(`/doctors/${id}`),
	getByClinic: (clinicId) => apiCall(`/doctors/clinic/${clinicId}`),
	create: (doctor) => apiCall("/doctors", { method: "POST", body: doctor }),
	update: (id, doctor) =>
		apiCall(`/doctors/${id}`, { method: "PUT", body: doctor }),
	delete: (id) => apiCall(`/doctors/${id}`, { method: "DELETE" }),
};

// Report API
export const reportAPI = {
	getSystemUsageReport: async (startDate, endDate) => {
		const params = new URLSearchParams();
		if (startDate) params.append("startDate", startDate);
		if (endDate) params.append("endDate", endDate);

		const url = `${API_BASE_URL}/report/system-usage${
			params.toString() ? "?" + params.toString() : ""
		}`;

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || `HTTP error! status: ${response.status}`);
			}

			// Get the PDF blob
			const blob = await response.blob();
			return blob;
		} catch (error) {
			console.error("Report API Error:", error);
			throw error;
		}
	},
	getDailyReport: async (clinicId, date) => {
		const params = new URLSearchParams();
		params.append("clinicId", clinicId);
		if (date) params.append("date", date);

		const url = `${API_BASE_URL}/report/daily?${params.toString()}`;

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || `HTTP error! status: ${response.status}`);
			}

			// Get the PDF blob
			const blob = await response.blob();
			return blob;
		} catch (error) {
			console.error("Daily Report API Error:", error);
			throw error;
		}
	},
};

// Backup API
export const backupAPI = {
	createBackup: () => apiCall("/admin/backup/create", { method: "POST" }),
	listBackups: () => apiCall("/admin/backup/list"),
	getBackupDetails: (fileName) =>
		apiCall(`/admin/backup/details/${encodeURIComponent(fileName)}`),
	downloadBackup: async (fileName) => {
		const url = `${API_BASE_URL}/admin/backup/download/${encodeURIComponent(
			fileName
		)}`;
		try {
			const response = await fetch(url, {
				method: "GET",
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			// Get the file blob
			const blob = await response.blob();
			return blob;
		} catch (error) {
			console.error("Download Backup Error:", error);
			throw error;
		}
	},
	restoreBackup: (fileName) =>
		apiCall(`/admin/backup/restore/${encodeURIComponent(fileName)}`, {
			method: "POST",
		}),
	deleteBackup: (fileName) =>
		apiCall(`/admin/backup/delete/${encodeURIComponent(fileName)}`, {
			method: "DELETE",
		}),
};
