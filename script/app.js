// Subtitle Uploader Application

class SubtitleUploader {
	constructor() {
		this.files = [];
		this.languageCodes = null;
		this.initializeElements();
		this.attachEventListeners();
		this.disableFileSelection();
	}

	disableFileSelection() {
		this.fileInputBtn.disabled = true;
		this.dropZone.style.opacity = "0.5";
		this.dropZone.style.pointerEvents = "none";
	}

	enableFileSelection() {
		this.fileInputBtn.disabled = false;
		this.dropZone.style.opacity = "1";
		this.dropZone.style.pointerEvents = "auto";
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
		this.languageListDatalist = document.getElementById("languageList");
	}

	attachEventListeners() {
		// 폴더 조회 버튼 클릭
		this.fetchFoldersBtn.addEventListener("click", () => {
			this.fetchFolders();
		});

		// 폴더 선택 변경 시 파일 선택 활성화
		this.folderSelect.addEventListener("change", () => {
			if (this.folderSelect.value) {
				this.enableFileSelection();
			} else {
				this.disableFileSelection();
			}
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

	getApiKey() {
		const apiKey = this.apiKeyInput.value.trim();
		if (!apiKey) {
			this.showAlert("API Key를 입력하세요.", "danger");
			return null;
		}
		return apiKey;
	}

	async fetchFolders() {
		const apiKey = this.getApiKey();
		if (!apiKey) return;

		// 버튼 비활성화 및 로딩 표시
		this.fetchFoldersBtn.disabled = true;
		this.fetchFoldersBtn.innerHTML =
			'<span class="spinner-border spinner-border-sm me-2"></span>조회 중...';

		try {
			// 폴더 목록과 언어 코드를 병렬로 로드
			const [foldersResponse] = await Promise.all([
				fetch(
					"https://api.v4.wecandeo.com/info/videopack/folder/v1/info.json",
					{
						method: "GET",
						headers: {
							"x-api-key": apiKey,
							"Content-Type": "application/json",
						},
					}
				),
				this.loadLanguageCodes(),
			]);

			if (!foldersResponse.ok) {
				const errorText = await foldersResponse.text();
				throw new Error(
					`API 호출 실패 (${foldersResponse.status}): ${errorText}`
				);
			}

			const data = await foldersResponse.json();

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

	async loadLanguageCodes() {
		const STORAGE_KEY = "languageCodes";
		const TIMESTAMP_KEY = "languageCodesTimestamp";
		const ONE_DAY = 24 * 60 * 60 * 1000; // 1일 (밀리초)

		try {
			// 로컬스토리지에서 캐시된 데이터 확인
			const cachedData = localStorage.getItem(STORAGE_KEY);
			const cachedTimestamp = localStorage.getItem(TIMESTAMP_KEY);

			// 캐시가 있고 1일이 지나지 않았다면 캐시 사용
			if (
				cachedData &&
				cachedTimestamp &&
				Date.now() - parseInt(cachedTimestamp) < ONE_DAY
			) {
				this.languageCodes = JSON.parse(cachedData);
				this.populateLanguageDatalist();
				console.log("언어 코드 목록 로드 완료 (캐시)");
				return;
			}

			// API Key 가져오기 (이 함수는 폴더 조회 시 호출되므로 항상 API Key가 있음)
			const apiKey = this.apiKeyInput.value.trim();

			// API 호출
			const response = await fetch(
				"https://api.v4.wecandeo.com/info/videopack/caption/v1/language.json",
				{
					method: "GET",
					headers: {
						"x-api-key": apiKey,
						"Content-Type": "application/json",
					},
				}
			);

			if (!response.ok) {
				throw new Error(`언어 코드 API 호출 실패: ${response.status}`);
			}

			const data = await response.json();

			// 로컬스토리지에 저장
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
			localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());

			this.languageCodes = data;
			this.populateLanguageDatalist();
			console.log("언어 코드 목록 로드 완료 (API)");
		} catch (error) {
			console.error("언어 코드 목록 로드 실패:", error);
			// 에러 발생 시에도 캐시가 있다면 사용
			const cachedData = localStorage.getItem(STORAGE_KEY);
			if (cachedData) {
				this.languageCodes = JSON.parse(cachedData);
				this.populateLanguageDatalist();
				console.log("언어 코드 목록 로드 완료 (캐시 - 에러 발생)");
			}
		}
	}

	populateLanguageDatalist() {
		if (!this.languageCodes || !this.languageCodes.caption || !this.languageCodes.caption.language) {
			return;
		}

		this.languageListDatalist.innerHTML = "";
		this.languageCodes.caption.language.forEach((lang) => {
			const option = document.createElement("option");
			option.value = `${lang.language} (${lang.code})`;
			option.setAttribute('data-lang-id', lang.langId);
			option.setAttribute('data-code', lang.code);
			option.setAttribute('data-language', lang.language);
			this.languageListDatalist.appendChild(option);
		});
	}

	detectLanguageCode(fileName) {
		// 파일명에서 확장자 제거
		const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
		// 언더바로 분리
		const parts = nameWithoutExt.split("_");
		// 마지막 조각
		const lastPart = parts[parts.length - 1];

		// 언어 코드 목록이 없으면 null 반환
		if (!this.languageCodes || !this.languageCodes.caption || !this.languageCodes.caption.language) {
			return null;
		}

		// 언어 코드 목록에서 매칭되는지 확인
		const matchedLanguage = this.languageCodes.caption.language.find((lang) => {
			return lang.code === lastPart;
		});

		return matchedLanguage || null;
	}

	// 파일명에서 언어 코드를 제외한 제목 추출
	getFileTitle(fileName) {
		const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
		const parts = nameWithoutExt.split("_");

		// 마지막 부분이 언어 코드인지 확인
		const lastPart = parts[parts.length - 1];
		if (this.languageCodes && this.languageCodes.caption && this.languageCodes.caption.language) {
			const isLanguageCode = this.languageCodes.caption.language.some(
				(lang) => lang.code === lastPart
			);
			if (isLanguageCode) {
				// 마지막 부분이 언어 코드면 제외
				return parts.slice(0, -1).join("_");
			}
		}

		// 언어 코드가 아니면 전체 반환
		return nameWithoutExt;
	}

	// 문자열 유사도 계산 (Levenshtein distance)
	calculateSimilarity(str1, str2) {
		const s1 = str1.toLowerCase();
		const s2 = str2.toLowerCase();

		const costs = [];
		for (let i = 0; i <= s1.length; i++) {
			let lastValue = i;
			for (let j = 0; j <= s2.length; j++) {
				if (i === 0) {
					costs[j] = j;
				} else if (j > 0) {
					let newValue = costs[j - 1];
					if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
						newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
					}
					costs[j - 1] = lastValue;
					lastValue = newValue;
				}
			}
			if (i > 0) {
				costs[s2.length] = lastValue;
			}
		}

		const maxLength = Math.max(s1.length, s2.length);
		return maxLength === 0 ? 1 : (maxLength - costs[s2.length]) / maxLength;
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
					(f) => f.file.name === file.name && f.file.size === file.size
				)
			) {
				const detectedLanguage = this.detectLanguageCode(file.name);
				this.files.push({
					file: file,
					langId: detectedLanguage ? detectedLanguage.langId : null,
					languageName: detectedLanguage ? detectedLanguage.language : '',
					languageCode: detectedLanguage ? detectedLanguage.code : ''
				});
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

		// 파일 이름순으로 정렬
		this.files.sort((a, b) => a.file.name.localeCompare(b.file.name));

		this.fileListCard.style.display = "block";
		this.uploadButtonContainer.style.display = "block";
		this.fileCount.textContent = this.files.length;

		this.fileList.innerHTML = "";
		this.files.forEach((file, index) => {
			const listItem = this.createFileListItem(file, index);
			this.fileList.appendChild(listItem);
		});
	}

	createFileListItem(fileObj, index) {
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
		fileName.textContent = fileObj.file.name;

		const fileSize = document.createElement("div");
		fileSize.className = "file-size";
		fileSize.textContent = this.formatFileSize(fileObj.file.size);

		fileDetails.appendChild(fileName);
		fileDetails.appendChild(fileSize);
		fileInfo.appendChild(fileIcon);
		fileInfo.appendChild(fileDetails);

		// 언어 선택 입력 필드
		const languageInfo = document.createElement("div");
		languageInfo.className = "file-language";

		const languageInput = document.createElement("input");
		languageInput.type = "text";
		languageInput.className = "form-control form-control-sm";
		languageInput.setAttribute("list", "languageList");
		languageInput.placeholder = "언어 선택";

		// 초기값 설정 - 언어 이름과 코드를 함께 표시
		if (fileObj.languageName && fileObj.languageCode) {
			languageInput.value = `${fileObj.languageName} (${fileObj.languageCode})`;
		} else {
			languageInput.value = '';
		}
		languageInput.style.width = "200px";

		// 언어 선택 시 langId 업데이트
		languageInput.addEventListener("change", () => {
			const selectedValue = languageInput.value;
			if (this.languageCodes && this.languageCodes.caption && this.languageCodes.caption.language) {
				// "언어이름 (코드)" 형식에서 매칭
				const matchedLang = this.languageCodes.caption.language.find(
					(lang) => `${lang.language} (${lang.code})` === selectedValue
				);
				if (matchedLang) {
					this.files[index].langId = matchedLang.langId;
					this.files[index].languageName = matchedLang.language;
					this.files[index].languageCode = matchedLang.code;
				} else {
					this.files[index].langId = null;
					this.files[index].languageName = selectedValue;
					this.files[index].languageCode = '';
				}
			}
		});

		languageInfo.appendChild(languageInput);

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
		fileItem.appendChild(languageInfo);
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

		// 폴더 선택 확인
		const folderId = this.folderSelect.value;
		if (!folderId) {
			this.showAlert("폴더를 선택하세요.", "danger");
			return;
		}

		// API Key 확인
		const apiKey = this.getApiKey();
		if (!apiKey) return;

		// 업로드 버튼 비활성화
		this.uploadBtn.disabled = true;
		this.uploadBtn.innerHTML =
			'<span class="spinner-border spinner-border-sm me-2"></span>업로드 중...';

		// 진행률 표시
		this.progressCard.style.display = "block";
		this.progressBar.style.width = "0%";
		this.progressBar.textContent = "0%";
		this.progressText.textContent = "업로드를 시작합니다...";

		let successCount = 0;
		let failCount = 0;
		const errors = [];

		try {
			let previousTitle = null;
			let previousAccessKey = null;

			for (let i = 0; i < this.files.length; i++) {
				const fileObj = this.files[i];
				const currentTitle = this.getFileTitle(fileObj.file.name);

				this.progressText.textContent = `${i + 1}/${this.files.length} - ${fileObj.file.name} 처리 중...`;

				try {
					// langId 확인
					if (!fileObj.langId) {
						throw new Error("언어가 선택되지 않았습니다.");
					}

					let accessKey = null;

					// 1. 이전 파일과 제목이 같으면 accessKey 재사용
					if (currentTitle === previousTitle && previousAccessKey) {
						accessKey = previousAccessKey;
					} else {
						// 영상 검색
						accessKey = await this.findVideoAccessKey(folderId, currentTitle, apiKey);
						if (!accessKey) {
							throw new Error("매칭되는 영상을 찾을 수 없습니다.");
						}
						previousTitle = currentTitle;
						previousAccessKey = accessKey;
					}

					// 2. 업로드 토큰 획득
					const uploadInfo = await this.getUploadToken(accessKey, apiKey);

					// 3. 자막 파일 업로드
					await this.uploadCaption(uploadInfo, fileObj);

					successCount++;
				} catch (error) {
					failCount++;
					errors.push(`${fileObj.file.name}: ${error.message}`);
					console.error(`Upload failed for ${fileObj.file.name}:`, error);
				}

				// 진행률 업데이트
				const progress = Math.round(((i + 1) / this.files.length) * 100);
				this.progressBar.style.width = progress + "%";
				this.progressBar.textContent = progress + "%";
			}

			// 결과 메시지
			if (failCount === 0) {
				this.showAlert(
					`성공적으로 ${successCount}개의 파일을 업로드했습니다!`,
					"success"
				);
			} else {
				const errorMsg = errors.join("\n");
				this.showAlert(
					`${successCount}개 성공, ${failCount}개 실패\n실패 목록:\n${errorMsg}`,
					"danger"
				);
			}

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

	// 영상 검색 및 가장 유사한 accessKey 찾기
	async findVideoAccessKey(folderId, title, apiKey) {
		const url = `https://api.v4.wecandeo.com/info/videopack/folder/v1/videos.json?folderId=${folderId}&searchItem=title&keyword=${encodeURIComponent(title)}`;

		console.log('=== Find Video Request ===');
		console.log('URL:', url);
		console.log('folderId:', folderId);
		console.log('title:', title);

		const response = await fetch(url, {
			method: "GET",
			headers: {
				"x-api-key": apiKey,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`영상 검색 API 호출 실패: ${response.status}`);
		}

		const data = await response.json();
		console.log('Video search response:', data);

		if (!data.videoInfoList || !data.videoInfoList.folderVideoList || data.videoInfoList.folderVideoList.length === 0) {
			return null;
		}

		// 가장 유사한 영상 찾기
		let bestMatch = null;
		let bestSimilarity = 0;

		data.videoInfoList.folderVideoList.forEach((video) => {
			const similarity = this.calculateSimilarity(title, video.title);
			if (similarity > bestSimilarity) {
				bestSimilarity = similarity;
				bestMatch = video;
			}
		});

		return bestMatch ? bestMatch.accessKey : null;
	}

	// 업로드 토큰 획득
	async getUploadToken(accessKey, apiKey) {
		const url = `https://api.v4.wecandeo.com/info/videopack/caption/v1/upload/token.json?accessKey=${accessKey}`;

		console.log('=== Get Upload Token Request ===');
		console.log('URL:', url);
		console.log('accessKey:', accessKey);

		const response = await fetch(url, {
			method: "GET",
			headers: {
				"x-api-key": apiKey,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`업로드 토큰 API 호출 실패: ${response.status}`);
		}

		const data = await response.json();
		console.log('Upload token response:', data);

		if (!data.uploadUrl || !data.token) {
			throw new Error("업로드 정보를 가져올 수 없습니다.");
		}

		return {
			uploadUrl: data.uploadUrl,
			token: data.token,
		};
	}

	// 자막 파일 업로드
	async uploadCaption(uploadInfo, fileObj) {
		const formData = new FormData();
		formData.append("token", uploadInfo.token);
		formData.append("langId", fileObj.langId);
		formData.append("file", fileObj.file);

		const url = `${uploadInfo.uploadUrl}?token=${uploadInfo.token}`;

		// 업로드 요청 정보 로깅
		console.log('=== Caption Upload Request ===');
		console.log('URL:', url);
		console.log('Method: POST');
		console.log('FormData contents:');
		console.log('  - token:', uploadInfo.token);
		console.log('  - langId:', fileObj.langId);
		console.log('  - file:', fileObj.file.name, `(${fileObj.file.size} bytes)`);
		console.log('uploadInfo:', uploadInfo);
		console.log('fileObj:', fileObj);

		const response = await fetch(url, {
			method: "POST",
			body: formData,
		});

		console.log('Response status:', response.status);
		console.log('Response headers:', Object.fromEntries(response.headers.entries()));

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Error response:', errorText);
			throw new Error(`자막 업로드 실패 (${response.status}): ${errorText}`);
		}

		const result = await response.json();
		console.log('Upload success:', result);
		return result;
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
