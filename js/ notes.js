class NotesManager {
  constructor(supabase) {
    this.supabase = supabase;
    this.userId = null;
    this.notes = [];
    this.activeNote = null;
    this.dirty = false;
    this.revision = 0;
    this.savePromise = null;

    this.listEl = document.getElementById("notes-list");
    this.emptyEl = document.getElementById("notes-empty");
    this.editorEl = document.getElementById("note-editor");
    this.titleInput = document.getElementById("note-title");
    this.contentInput = document.getElementById("note-content");
    this.backgroundInput = document.getElementById("note-background");
    this.canvas = document.getElementById("note-canvas");
    this.context = this.canvas.getContext("2d");
    this.saveButton = document.getElementById("save-note-btn");
    this.statusEl = document.getElementById("note-save-status");
    this.errorEl = document.getElementById("notes-load-error");

    document.getElementById("create-note-btn").addEventListener("click", () => {
      this.createNote().catch(error => this.showError(`Could not create note: ${error.message}`));
    });
    this.saveButton.addEventListener("click", () => {
      this.saveCurrentNote().catch(error => this.showError(`Could not save note: ${error.message}`));
    });
    this.titleInput.addEventListener("input", () => this.markDirty());
    this.contentInput.addEventListener("input", () => this.markDirty());
    this.backgroundInput.addEventListener("input", () => {
      this.editorEl.style.setProperty("--note-background", this.backgroundInput.value);
      this.markDirty();
    });
    document.getElementById("clear-note-drawing").addEventListener("click", () => {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.markDirty();
    });

    this.canvas.addEventListener("pointerdown", event => this.startDrawing(event));
    this.canvas.addEventListener("pointermove", event => this.draw(event));
    this.canvas.addEventListener("pointerup", () => this.finishDrawing());
    this.canvas.addEventListener("pointercancel", () => this.finishDrawing());
  }

  async load(userId) {
    this.userId = userId;
    this.notes = [];
    this.setActiveNote(null);
    this.renderList();
    const { data, error } = await this.supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    if (this.userId !== userId) return;

    this.notes = data;
    this.renderList();
    if (this.notes.length) {
      this.setActiveNote(this.notes[0]);
    } else {
      this.setActiveNote(null);
    }
  }

  clear() {
    this.userId = null;
    this.notes = [];
    this.setActiveNote(null);
    this.errorEl.textContent = "";
    this.errorEl.classList.add("hidden");
    this.renderList();
  }

  async createNote() {
    if (!this.userId) return;
    await this.saveCurrentNote();
    if (!this.userId) return;

    const userId = this.userId;
    const { data, error } = await this.supabase
      .from("notes")
      .insert({
        user_id: userId,
        title: "Untitled note",
        content: "",
        background_color: "#fff8c5",
        drawing_data: null
      })
      .select("*")
      .single();
    if (error) throw error;
    if (this.userId !== userId) return;

    this.notes.unshift(data);
    this.setActiveNote(data);
    this.renderList();
  }

  async openNote(note) {
    await this.saveCurrentNote();
    const latestNote = this.notes.find(item => item.id === note.id);
    if (latestNote) this.setActiveNote(latestNote);
  }

  async saveCurrentNote() {
    if (this.savePromise) await this.savePromise;
    if (!this.activeNote || !this.dirty || !this.userId) return;

    const noteId = this.activeNote.id;
    const userId = this.userId;
    const savePromise = (async () => {
      while (this.dirty && this.activeNote?.id === noteId && this.userId === userId) {
        const revision = this.revision;
        const values = {
          title: this.titleInput.value.trim() || "Untitled note",
          content: this.contentInput.value,
          background_color: this.backgroundInput.value,
          drawing_data: this.canvasHasDrawing() ? this.canvas.toDataURL("image/png") : null,
          updated_at: new Date().toISOString()
        };
        this.statusEl.textContent = "Saving...";
        this.saveButton.disabled = true;

        const { data, error } = await this.supabase
          .from("notes")
          .update(values)
          .eq("id", noteId)
          .eq("user_id", userId)
          .select("*")
          .single();
        if (error) throw error;
        if (this.userId !== userId || this.activeNote?.id !== noteId) return;

        this.notes = this.notes.map(note => note.id === noteId ? data : note);
        this.activeNote = data;
        this.dirty = this.revision !== revision;
        if (!this.dirty) {
          this.statusEl.textContent = "Saved";
          this.renderList();
        }
      }
    })();
    this.savePromise = savePromise;
    try {
      await savePromise;
    } finally {
      if (this.savePromise === savePromise) this.savePromise = null;
      this.saveButton.disabled = false;
    }
  }

  setActiveNote(note) {
    this.activeNote = note;
    this.dirty = false;
    this.revision = 0;
    this.errorEl.textContent = "";
    this.errorEl.classList.add("hidden");
    this.statusEl.textContent = "";
    this.editorEl.classList.toggle("hidden", !note);
    if (note) {
      this.titleInput.value = note.title || "";
      this.contentInput.value = note.content || "";
      this.backgroundInput.value = note.background_color || "#fff8c5";
      this.editorEl.style.setProperty("--note-background", this.backgroundInput.value);
      this.clearCanvas();
      if (note.drawing_data) {
        const image = new Image();
        image.onload = () => {
          if (this.activeNote?.id === note.id) {
            this.context.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
          }
        };
        image.onerror = () => this.showError("Could not load the drawing for this note.");
        image.src = note.drawing_data;
      }
    } else {
      this.clearCanvas();
    }
    this.renderList();
  }

  renderList() {
    this.listEl.replaceChildren();
    this.notes.forEach(note => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "note-list-item";
      button.classList.toggle("active", note.id === this.activeNote?.id);
      button.textContent = note.title || "Untitled note";
      button.addEventListener("click", () => {
        this.openNote(note).catch(error => this.showError(`Could not open note: ${error.message}`));
      });
      this.listEl.appendChild(button);
    });
    this.emptyEl.classList.toggle("hidden", this.notes.length > 0);
  }

  markDirty() {
    if (!this.activeNote) return;
    this.dirty = true;
    this.revision += 1;
    this.statusEl.textContent = "Unsaved changes";
    this.errorEl.textContent = "";
    this.errorEl.classList.add("hidden");
  }

  startDrawing(event) {
    if (!this.activeNote) return;
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.context.beginPath();
    const point = this.canvasPoint(event);
    this.context.moveTo(point.x, point.y);
    this.context.lineWidth = Math.max(2, 4 * this.canvas.width / this.canvas.clientWidth);
    this.context.lineCap = "round";
    this.context.lineJoin = "round";
    this.context.strokeStyle = "#172554";
    this.isDrawing = true;
    this.drawingChanged = false;
  }

  draw(event) {
    if (!this.isDrawing) return;
    const point = this.canvasPoint(event);
    this.context.lineTo(point.x, point.y);
    this.context.stroke();
    this.drawingChanged = true;
  }

  finishDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.drawingChanged) this.markDirty();
  }

  canvasPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * this.canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * this.canvas.height / bounds.height
    };
  }

  clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  canvasHasDrawing() {
    const pixels = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] !== 0) return true;
    }
    return false;
  }

  showError(message) {
    this.errorEl.textContent = message;
    this.errorEl.classList.remove("hidden");
    this.statusEl.textContent = "";
  }
}
