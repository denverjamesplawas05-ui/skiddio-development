"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const DEFAULT_BACKGROUND = "#fff8c5";

export default function NotesView({ userId, active }) {
  const [notes, setNotes] = useState([]);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef(null);
  const titleRef = useRef(null);
  const hasDrawing = useRef(false);
  const isDrawing = useRef(false);

  function clearCanvas() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  function loadDrawing(data) {
    clearCanvas();
    hasDrawing.current = Boolean(data);
    if (!data) return;

    const canvas = canvasRef.current;
    const image = new Image();
    image.onload = () => canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = data;
  }

  function selectNote(note) {
    setCurrentNoteId(note.id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setBackground(note.background_color || DEFAULT_BACKGROUND);
    setStatus("");
    setEditorOpen(true);
    loadDrawing(note.drawing_data);
  }

  // Load this user's notes when the dashboard opens
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      const { data, error: loadError } = await supabase
        .from("notes")
        .select("id, user_id, title, content, background_color, drawing_data, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (loadError) {
        setError(`Could not load your notes: ${loadError.message}`);
        return;
      }
      setNotes(data || []);
      if (data?.length) {
        selectNote(data[0]);
      } else {
        setCurrentNoteId(null);
        setEditorOpen(false);
      }
    }

    load().catch((e) => { if (!cancelled) setError(`Could not load your notes: ${e.message}`); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function createNote() {
    setCurrentNoteId(null);
    setTitle("");
    setContent("");
    setBackground(DEFAULT_BACKGROUND);
    clearCanvas();
    hasDrawing.current = false;
    setStatus("Unsaved note");
    setEditorOpen(true);
    setTimeout(() => titleRef.current?.focus(), 0);
  }

  async function saveNote() {
    if (!userId) {
      setStatus("Sign in to save notes.");
      return;
    }

    setSaving(true);
    setStatus("Saving…");

    const note = {
      user_id: userId,
      title: title.trim() || "Untitled note",
      content,
      background_color: background,
      drawing_data: hasDrawing.current ? canvasRef.current.toDataURL("image/png") : null,
      updated_at: new Date().toISOString(),
    };

    try {
      const query = currentNoteId
        ? supabase.from("notes").update(note).eq("id", currentNoteId).eq("user_id", userId).select().single()
        : supabase.from("notes").insert(note).select().single();
      const { data, error: saveError } = await query;
      if (saveError) throw saveError;

      setCurrentNoteId(data.id);
      setNotes((prev) => [data, ...prev.filter((item) => item.id !== data.id)]);
      setStatus("Saved");
    } catch (e) {
      setStatus(`Could not save note: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ---- drawing ----
  function canvasPoint(event) {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return [
      ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    ];
  }

  function startDrawing(event) {
    if (!editorOpen) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(...canvasPoint(event));
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    isDrawing.current = true;
    hasDrawing.current = true;
  }

  function draw(event) {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(...canvasPoint(event));
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawing.current = false;
  }

  function clearDrawing() {
    clearCanvas();
    hasDrawing.current = false;
  }

  return (
    <section id="notes-view" className={`notes-workspace ${active ? "" : "hidden"}`} aria-label="Notes">
      <aside className="card notes-list-panel">
        <div className="notes-list-heading">
          <h3>Your notes</h3>
          <button className="btn btn-primary" type="button" onClick={createNote}>New note</button>
        </div>
        <div className="notes-list" aria-label="Your notes">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={`note-list-item ${note.id === currentNoteId ? "active" : ""}`}
              onClick={() => selectNote(note)}
            >
              {note.title || "Untitled note"}
            </button>
          ))}
        </div>
        {notes.length === 0 && <p className="notes-empty">No notes yet. Create one to get started.</p>}
      </aside>

      <section
        className={`card note-editor ${editorOpen ? "" : "hidden"}`}
        aria-label="Note editor"
        style={{ "--note-background": background }}
      >
        <div className="note-editor-toolbar">
          <label className="note-background-picker" htmlFor="note-background">
            Background
            <input
              id="note-background"
              type="color"
              value={background}
              aria-label="Note background color"
              onChange={(e) => setBackground(e.target.value)}
            />
          </label>
          <div className="note-editor-actions">
            <span className="note-save-status" role="status" aria-live="polite">{status}</span>
            <button className="btn btn-primary" type="button" disabled={saving} onClick={saveNote}>Save note</button>
          </div>
        </div>

        <label className="note-title-label" htmlFor="note-title">Title</label>
        <input
          id="note-title"
          ref={titleRef}
          className="note-title-input"
          type="text"
          maxLength={120}
          placeholder="Note title"
          aria-label="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          id="note-content"
          className="note-content-input"
          placeholder="Write your note..."
          aria-label="Note content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="note-drawing-section">
          <div className="note-drawing-heading">
            <h3>Drawing</h3>
            <button className="btn calendar-btn-secondary" type="button" onClick={clearDrawing}>Clear drawing</button>
          </div>
          <p className="note-drawing-hint">Draw directly on the canvas with your mouse, touch, or pen.</p>
          <canvas
            id="note-canvas"
            ref={canvasRef}
            width={1200}
            height={480}
            aria-label="Drawing canvas"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerLeave={stopDrawing}
          />
        </div>
      </section>

      {error && <p className="notes-error" role="alert">{error}</p>}
    </section>
  );
}
