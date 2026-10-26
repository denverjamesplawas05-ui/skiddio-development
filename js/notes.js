class NotesManager {
  constructor(supabase) {
    this.supabase = supabase;
    this.notes = [];
    this.userId = null;
    this.currentNoteId = null;

    this.list = document.getElementById("notes-list");
    this.empty = document.getElementById("notes-empty");
    this.editor = document.getElementById("note-editor");
    this.error = document.getElementById("notes-load-error");
    this.title = document.getElementById("note-title");
    this.content = document.getElementById("note-content");
    this.background = document.getElementById("note-background");
    this.status = document.getElementById("note-save-status");
    this.canvas = document.getElementById("note-canvas");
    this.context = this.canvas.getContext("2d");

    document.getElementById("create-note-btn").addEventListener("click", () => this.create());
    document.getElementById("save-note-btn").addEventListener("click", () => this.save());
    document.getElementById("clear-note-drawing").addEventListener("click", () => this.clearDrawing());
    this.canvas.addEventListener("pointerdown", event => this.startDrawing(event));
    this.canvas.addEventListener("pointermove", event => this.draw(event));
    this.canvas.addEventListener("pointerup", () => this.stopDrawing());
    this.canvas.addEventListener("pointercancel", () => this.stopDrawing());
    this.canvas.addEventListener("pointerleave", () => this.stopDrawing());
  }

  async load(userId) {
    this.userId = userId;
    this.showError();
    const { data, error } = await this.supabase
      .from("notes")
      .select("id, user_id, title, content, background_color, drawing_data, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    this.notes = data || [];
    this.renderList();

    if (this.notes.length) {
      this.select(this.notes[0]);
    } else {
      this.currentNoteId = null;
      this.editor.classList.add("hidden");
    }
  }

  clear() {
    this.userId = null;
    this.currentNoteId = null;
    this.notes = [];
    this.list.replaceChildren();
    this.empty.classList.remove("hidden");
    this.editor.classList.add("hidden");
    this.showError();
  }

  showError(message = "") {
    this.error.textContent = message;
    this.error.classList.toggle("hidden", !message);
  }

  create() {
    this.currentNoteId = null;
    this.title.value = "";
    this.content.value = "";
    this.background.value = "#fff8c5";
    this.editor.style.setProperty("--note-background", this.background.value);
    this.clearDrawing();
    this.status.textContent = "Unsaved note";
    this.editor.classList.remove("hidden");
    this.title.focus();
    this.renderList();
  }

  async save() {
    if (!this.userId) {
      this.status.textContent = "Sign in to save notes.";
      return;
    }

    const saveButton = document.getElementById("save-note-btn");
    saveButton.disabled = true;
    this.status.textContent = "Saving…";

    const note = {
      user_id: this.userId,
      title: this.title.value.trim() || "Untitled note",
      content: this.content.value,
      background_color: this.background.value,
      drawing_data: this.canvasHasDrawing ? this.canvas.toDataURL("image/png") : null,
      updated_at: new Date().toISOString()
    };

    try {
      const query = this.currentNoteId
        ? this.supabase.from("notes").update(note).eq("id", this.currentNoteId).eq("user_id", this.userId).select().single()
        : this.supabase.from("notes").insert(note).select().single();
      const { data, error } = await query;
      if (error) throw error;

      this.currentNoteId = data.id;
      this.notes = [data, ...this.notes.filter(item => item.id !== data.id)];
      this.status.textContent = "Saved";
      this.renderList();
    } catch (error) {
      this.status.textContent = `Could not save note: ${error.message}`;
    } finally {
      saveButton.disabled = false;
    }
  }

  renderList() {
    this.list.replaceChildren();
    this.empty.classList.toggle("hidden", this.notes.length > 0);
    this.notes.forEach(note => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "note-list-item";
      button.classList.toggle("active", note.id === this.currentNoteId);
      button.textContent = note.title || "Untitled note";
      button.addEventListener("click", () => this.select(note));
      this.list.append(button);
    });
  }

  select(note) {
    this.currentNoteId = note.id;
    this.title.value = note.title || "";
    this.content.value = note.content || "";
    this.background.value = note.background_color || "#fff8c5";
    this.editor.style.setProperty("--note-background", this.background.value);
    this.status.textContent = "";
    this.editor.classList.remove("hidden");
    this.loadDrawing(note.drawing_data);
    this.renderList();
  }

  loadDrawing(data) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvasHasDrawing = Boolean(data);
    if (!data) return;

    const image = new Image();
    image.onload = () => this.context.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
    image.src = data;
  }

  clearDrawing() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvasHasDrawing = false;
  }

  startDrawing(event) {
    if (this.editor.classList.contains("hidden")) return;
    this.canvas.setPointerCapture(event.pointerId);
    this.context.beginPath();
    this.context.moveTo(...this.canvasPoint(event));
    this.context.lineWidth = 4;
    this.context.lineCap = "round";
    this.context.strokeStyle = "#1e293b";
    this.isDrawing = true;
    this.canvasHasDrawing = true;
  }

  draw(event) {
    if (!this.isDrawing) return;
    this.context.lineTo(...this.canvasPoint(event));
    this.context.stroke();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  canvasPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return [
      (event.clientX - bounds.left) * this.canvas.width / bounds.width,
      (event.clientY - bounds.top) * this.canvas.height / bounds.height
    ];
  }
}
