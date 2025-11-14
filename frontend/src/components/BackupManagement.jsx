import { useState, useEffect } from "react";
import { backupAPI } from "../lib/api";
import LoadingSpinner from "./LoadingSpinner";
import "./BackupManagement.css";

const BackupManagement = ({ showToast }) => {
	const [backups, setBackups] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selectedBackup, setSelectedBackup] = useState(null);
	const [backupDetails, setBackupDetails] = useState(null);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);

	useEffect(() => {
		loadBackups();
	}, []);

	const loadBackups = async () => {
		try {
			setLoading(true);
			const data = await backupAPI.listBackups();
			setBackups(data);
		} catch (error) {
			console.error("Failed to load backups:", error);
			showToast?.("Failed to load backups: " + error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleCreateBackup = async () => {
		try {
			setLoading(true);
			showToast?.("Creating backup...", "info");
			const result = await backupAPI.createBackup();
			showToast?.("Backup created successfully!", "success");
			await loadBackups();
		} catch (error) {
			console.error("Failed to create backup:", error);
			showToast?.("Failed to create backup: " + error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleViewDetails = async (backup) => {
		try {
			setLoading(true);
			const details = await backupAPI.getBackupDetails(backup.fileName);
			setBackupDetails(details);
			setSelectedBackup(backup);
		} catch (error) {
			console.error("Failed to load backup details:", error);
			showToast?.("Failed to load details: " + error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleDownloadBackup = async (backup) => {
		try {
			setLoading(true);
			showToast?.("Downloading backup...", "info");
			const blob = await backupAPI.downloadBackup(backup.fileName);

			// Create download link
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = backup.fileName;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			showToast?.("Backup downloaded successfully!", "success");
		} catch (error) {
			console.error("Failed to download backup:", error);
			showToast?.("Failed to download backup: " + error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const confirmRestore = (backup) => {
		setSelectedBackup(backup);
		setConfirmAction("restore");
		setShowConfirmDialog(true);
	};

	const confirmDelete = (backup) => {
		setSelectedBackup(backup);
		setConfirmAction("delete");
		setShowConfirmDialog(true);
	};

	const handleRestoreBackup = async () => {
		if (!selectedBackup) return;

		try {
			setLoading(true);
			setShowConfirmDialog(false);
			showToast?.("Restoring backup... This may take a few minutes.", "info");
			await backupAPI.restoreBackup(selectedBackup.fileName);
			showToast?.(
				"Backup restored successfully! Please refresh the page.",
				"success"
			);
			await loadBackups();
		} catch (error) {
			console.error("Failed to restore backup:", error);
			showToast?.("Failed to restore backup: " + error.message, "error");
		} finally {
			setLoading(false);
			setSelectedBackup(null);
		}
	};

	const handleDeleteBackup = async () => {
		if (!selectedBackup) return;

		try {
			setLoading(true);
			setShowConfirmDialog(false);
			await backupAPI.deleteBackup(selectedBackup.fileName);
			showToast?.("Backup deleted successfully!", "success");
			await loadBackups();
			if (backupDetails?.fileName === selectedBackup.fileName) {
				setBackupDetails(null);
			}
		} catch (error) {
			console.error("Failed to delete backup:", error);
			showToast?.("Failed to delete backup: " + error.message, "error");
		} finally {
			setLoading(false);
			setSelectedBackup(null);
		}
	};

	const formatFileSize = (bytes) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
	};

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleString();
	};

	return (
		<div className="backup-management">
			<div className="backup-header">
				<h2>🗄️ Backup & Restore</h2>
				<button
					onClick={handleCreateBackup}
					disabled={loading}
					className="btn-primary"
				>
					➕ Create New Backup
				</button>
			</div>

			{loading && <LoadingSpinner />}

			<div className="backup-content">
				{/* Backup List */}
				<div className="backup-list-section">
					<h3>Available Backups ({backups.length})</h3>

					{backups.length === 0 ? (
						<div className="empty-state">
							<p>No backups found. Create your first backup to get started.</p>
						</div>
					) : (
						<div className="backup-list">
							{backups.map((backup) => (
								<div
									key={backup.fileName}
									className={`backup-item ${
										selectedBackup?.fileName === backup.fileName ? "selected" : ""
									}`}
								>
									<div className="backup-item-header">
										<div className="backup-item-info">
											<h4>{backup.fileName}</h4>
											<p className="backup-date">📅 {formatDate(backup.createdDate)}</p>
											<p className="backup-size">💾 {formatFileSize(backup.fileSize)}</p>
										</div>
									</div>

									<div className="backup-item-actions">
										<button
											onClick={() => handleViewDetails(backup)}
											className="btn-secondary btn-sm"
											title="View Details"
										>
											👁️ Details
										</button>
										<button
											onClick={() => handleDownloadBackup(backup)}
											className="btn-secondary btn-sm"
											title="Download"
										>
											⬇️ Download
										</button>
										<button
											onClick={() => confirmRestore(backup)}
											className="btn-warning btn-sm"
											title="Restore"
										>
											♻️ Restore
										</button>
										<button
											onClick={() => confirmDelete(backup)}
											className="btn-danger btn-sm"
											title="Delete"
										>
											🗑️ Delete
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Backup Details */}
				{backupDetails && (
					<div className="backup-details-section">
						<h3>Backup Details</h3>
						<div className="backup-details">
							<div className="detail-row">
								<span className="detail-label">File Name:</span>
								<span className="detail-value">{backupDetails.fileName}</span>
							</div>
							<div className="detail-row">
								<span className="detail-label">Created:</span>
								<span className="detail-value">
									{formatDate(backupDetails.createdDate)}
								</span>
							</div>
							<div className="detail-row">
								<span className="detail-label">File Size:</span>
								<span className="detail-value">
									{formatFileSize(backupDetails.fileSize)}
								</span>
							</div>

							{backupDetails.entityCounts && (
								<>
									<h4>Data Contents:</h4>
									<div className="entity-counts">
										{Object.entries(backupDetails.entityCounts).map(([entity, count]) => (
											<div key={entity} className="entity-count-item">
												<span className="entity-name">{entity.replace("_", " ")}:</span>
												<span className="entity-count">{count} records</span>
											</div>
										))}
									</div>
								</>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Confirmation Dialog */}
			{showConfirmDialog && (
				<div className="modal-overlay" onClick={() => setShowConfirmDialog(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<h3>⚠️ Confirm {confirmAction === "restore" ? "Restore" : "Delete"}</h3>

						{confirmAction === "restore" ? (
							<>
								<p className="warning-text">
									<strong>WARNING:</strong> Restoring this backup will{" "}
									<strong>DELETE ALL CURRENT DATA</strong>
									and replace it with the data from this backup.
								</p>
								<p>
									Backup: <strong>{selectedBackup?.fileName}</strong>
								</p>
								<p>
									Created: <strong>{formatDate(selectedBackup?.createdDate)}</strong>
								</p>
								<p className="recommendation">
									💡 It's recommended to create a current backup before restoring.
								</p>
							</>
						) : (
							<>
								<p>Are you sure you want to delete this backup?</p>
								<p>
									Backup: <strong>{selectedBackup?.fileName}</strong>
								</p>
								<p className="warning-text">This action cannot be undone.</p>
							</>
						)}

						<div className="modal-actions">
							<button
								onClick={() => setShowConfirmDialog(false)}
								className="btn-secondary"
							>
								Cancel
							</button>
							<button
								onClick={
									confirmAction === "restore" ? handleRestoreBackup : handleDeleteBackup
								}
								className={confirmAction === "restore" ? "btn-warning" : "btn-danger"}
							>
								{confirmAction === "restore" ? "♻️ Restore" : "🗑️ Delete"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default BackupManagement;
