// Subtitle Uploader Application

class SubtitleUploader {
	constructor() {
		this.files = [];
		this.initializeElements();
		this.attachEventListeners();
	}

	initializeElements() {
		this.apiKeyInput = document.getElementById("apiKey");
		this.fetchFoldersBtn = document.getElementById("fetchFoldersBtn");
		this.folderSelect = document.getElementById("folderSelect");
		this.dropZone = document.getElementById("dropZone");
		this.fileInput = document.getElementById("fileInput");
		this.fileInputBtn = document.getElementById("fileInputBtn");
		this.fileList = document.getElementById("fileList");
		this.fileListCard = document.getElementById("fileListCard");
		this.fileCount = document.getElementById("fileCount");
		this.uploadBtn = document.getElementById("uploadBtn");
		this.uploadButtonContainer = document.getElementById(
			"uploadButtonContainer"
		);
		this.progressCard = document.getElementById("progressCard");
		this.progressBar = document.getElementById("progressBar");
		this.progressText = document.getElementById("progressText");
		this.toastContainer = document.getElementById("toastContainer");
	}

	attachEventListeners() {
		// 폴더 조회 버튼 클릭
		this.fetchFoldersBtn.addEventListener("click", () => {
			this.fetchFolders();
		});

		// 파일 선택 버튼 클릭
		this.fileInputBtn.addEventListener("click", () => {
			this.fileInput.click();
		});

		// 파일 입력 변경
		this.fileInput.addEventListener("change", (e) => {
			this.handleFiles(e.target.files);
		});

		// 드래그 앤 드롭 이벤트
		this.dropZone.addEventListener("dragover", (e) => {
			e.preventDefault();
			this.dropZone.classList.add("drag-over");
		});

		this.dropZone.addEventListener("dragleave", () => {
			this.dropZone.classList.remove("drag-over");
		});

		this.dropZone.addEventListener("drop", (e) => {
			e.preventDefault();
			this.dropZone.classList.remove("drag-over");
			this.handleFiles(e.dataTransfer.files);
		});

		// 업로드 버튼 클릭
		this.uploadBtn.addEventListener("click", () => {
			this.uploadFiles();
		});
	}

	async fetchFolders() {
		const apiKey = this.apiKeyInput.value.trim();

		if (!apiKey) {
			this.showAlert("API Key를 입력하세요.", "danger");
			return;
		}

		// 버튼 비활성화 및 로딩 표시
		this.fetchFoldersBtn.disabled = true;
		this.fetchFoldersBtn.innerHTML =
			'<span class="spinner-border spinner-border-sm me-2"></span>조회 중...';

		try {
			// API 호출
			const response = await fetch(
				"https://api.v4.wecandeo.com/info/videopack/folder/v1/info.json",
				{
					method: "GET",
					headers: {
						"x-api-key": apiKey,
						"Content-Type": "application/json",
					},
				}
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`API 호출 실패 (${response.status}): ${errorText}`
				);
			}

			const data = await response.json();

			// 폴더 목록 업데이트
			this.updateFolderList(data.folderList);
			this.showAlert("폴더 목록을 성공적으로 불러왔습니다.", "success");
		} catch (error) {
			this.showAlert(
				`폴더 조회 중 오류가 발생했습니다: ${error.message}`,
				"danger"
			);
			console.error("Fetch folders error:", error);
		} finally {
			// 버튼 복구
			this.fetchFoldersBtn.disabled = false;
			this.fetchFoldersBtn.innerHTML =
				'<i class="bi bi-folder-fill"></i> 폴더 조회';
		}
	}

	updateFolderList(folderList) {
		// 폴더 선택 드롭다운 활성화 및 초기화
		this.folderSelect.disabled = false;
		this.folderSelect.innerHTML =
			'<option value="">폴더를 선택하세요</option>';

		if (!folderList || folderList.length === 0) {
			this.folderSelect.innerHTML =
				'<option value="">사용 가능한 폴더가 없습니다</option>';
			return;
		}

		// 폴더 목록 추가
		folderList.forEach((folder) => {
			const option = document.createElement("option");
			option.value = folder.id;
			option.textContent = folder.folderName;
			this.folderSelect.appendChild(option);
		});
	}

	handleFiles(fileList) {
		const newFiles = Array.from(fileList).filter((file) => {
			// 자막 파일 확장자 확인
			const validExtensions = [".srt", ".vtt", ".ass", ".ssa", ".txt"];
			const fileName = file.name.toLowerCase();
			return validExtensions.some((ext) => fileName.endsWith(ext));
		});

		if (newFiles.length === 0) {
			this.showAlert(
				"지원하지 않는 파일 형식입니다. SRT, VTT, ASS, SSA, TXT 파일만 업로드 가능합니다.",
				"danger"
			);
			return;
		}

		// 중복 파일 제거
		newFiles.forEach((file) => {
			if (
				!this.files.find(
					(f) => f.name === file.name && f.size === file.size
				)
			) {
				this.files.push(file);
			}
		});

		this.updateFileList();
		this.fileInput.value = ""; // 같은 파일 다시 선택 가능하도록
	}

	updateFileList() {
		if (this.files.length === 0) {
			this.fileListCard.style.display = "none";
			this.uploadButtonContainer.style.display = "none";
			return;
		}

		this.fileListCard.style.display = "block";
		this.uploadButtonContainer.style.display = "block";
		this.fileCount.textContent = this.files.length;

		this.fileList.innerHTML = "";
		this.files.forEach((file, index) => {
			const listItem = this.createFileListItem(file, index);
			this.fileList.appendChild(listItem);
		});
	}

	createFileListItem(file, index) {
		const li = document.createElement("li");
		li.className = "list-group-item";

		const fileItem = document.createElement("div");
		fileItem.className = "file-item";

		const fileInfo = document.createElement("div");
		fileInfo.className = "file-info";

		const fileIcon = document.createElement("i");
		fileIcon.className = "bi bi-file-text file-icon";

		const fileDetails = document.createElement("div");
		fileDetails.className = "file-details";

		const fileName = document.createElement("div");
		fileName.className = "file-name";
		fileName.textContent = file.name;

		const fileSize = document.createElement("div");
		fileSize.className = "file-size";
		fileSize.textContent = this.formatFileSize(file.size);

		fileDetails.appendChild(fileName);
		fileDetails.appendChild(fileSize);
		fileInfo.appendChild(fileIcon);
		fileInfo.appendChild(fileDetails);

		const fileActions = document.createElement("div");
		fileActions.className = "file-actions";

		const removeBtn = document.createElement("button");
		removeBtn.className = "btn-remove";
		removeBtn.innerHTML = '<i class="bi bi-x-circle"></i>';
		removeBtn.title = "제거";
		removeBtn.addEventListener("click", () => {
			this.removeFile(index);
		});

		fileActions.appendChild(removeBtn);
		fileItem.appendChild(fileInfo);
		fileItem.appendChild(fileActions);
		li.appendChild(fileItem);

		return li;
	}

	removeFile(index) {
		this.files.splice(index, 1);
		this.updateFileList();
	}

	formatFileSize(bytes) {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return (
			Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
		);
	}

	async uploadFiles() {
		if (this.files.length === 0) {
			this.showAlert("업로드할 파일이 없습니다.", "danger");
			return;
		}

		// 업로드 버튼 비활성화
		this.uploadBtn.disabled = true;
		this.uploadBtn.innerHTML =
			'<span class="spinner-border spinner-border-sm me-2"></span>업로드 중...';

		// 진행률 표시
		this.progressCard.style.display = "block";
		this.progressBar.style.width = "0%";
		this.progressBar.textContent = "0%";
		this.progressText.textContent = "업로드를 시작합니다...";

		try {
			// FormData 생성
			const formData = new FormData();
			this.files.forEach((file, index) => {
				formData.append(`file_${index}`, file);
			});

			// 실제 업로드 로직 (여기서는 시뮬레이션)
			// 실제 환경에서는 서버 엔드포인트로 변경해야 합니다
			await this.simulateUpload(formData);

			// 성공 메시지
			this.showAlert(
				`성공적으로 ${this.files.length}개의 파일을 업로드했습니다!`,
				"success"
			);

			// 파일 목록 초기화
			this.files = [];
			this.updateFileList();
			this.progressCard.style.display = "none";
		} catch (error) {
			this.showAlert(
				`업로드 중 오류가 발생했습니다: ${error.message}`,
				"danger"
			);
		} finally {
			// 업로드 버튼 활성화
			this.uploadBtn.disabled = false;
			this.uploadBtn.innerHTML =
				'<i class="bi bi-upload"></i> 업로드 시작';
		}
	}

	async simulateUpload(formData) {
		// 실제 업로드를 시뮬레이션하는 함수
		// 실제 환경에서는 fetch API를 사용하여 서버로 전송해야 합니다
		return new Promise((resolve, reject) => {
			let progress = 0;
			const interval = setInterval(() => {
				progress += Math.random() * 15;
				if (progress >= 100) {
					progress = 100;
					clearInterval(interval);
					setTimeout(resolve, 500);
				}

				this.progressBar.style.width = progress + "%";
				this.progressBar.textContent = Math.round(progress) + "%";
				this.progressText.textContent = `${
					this.files.length
				}개 파일 중 ${Math.floor(
					(progress / 100) * this.files.length
				)}개 업로드 완료`;
			}, 200);
		});

		// 실제 서버 업로드 예시 코드:
		/*
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('업로드 실패');
        }

        return await response.json();
        */
	}

	showAlert(message, type) {
		// Toast 메시지 생성
		const toastId = "toast-" + Date.now();
		const bgClass = type === "success" ? "bg-success" : "bg-danger";

		const toastHTML = `
            <div class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" id="${toastId}">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

		// Toast 컨테이너에 추가
		this.toastContainer.insertAdjacentHTML("beforeend", toastHTML);

		// Toast 인스턴스 생성 및 표시 (자동으로 닫히지 않도록 autohide: false 설정)
		const toastElement = document.getElementById(toastId);
		const toast = new bootstrap.Toast(toastElement, {
			autohide: false, // 자동으로 닫히지 않음
		});
		toast.show();

		// Toast가 닫힐 때 DOM에서 제거
		toastElement.addEventListener("hidden.bs.toast", () => {
			toastElement.remove();
		});
	}
}

// 페이지 로드 시 앱 초기화
document.addEventListener("DOMContentLoaded", () => {
	new SubtitleUploader();
});
