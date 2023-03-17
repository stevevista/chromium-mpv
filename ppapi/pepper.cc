#include <locale.h>

#define GL_GLEXT_PROTOTYPES
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>
#include <ppapi/cpp/module.h>
#include <ppapi/cpp/instance.h>
#include <ppapi/cpp/var.h>
#include <ppapi/cpp/var_dictionary.h>
#include <ppapi/cpp/var_array_buffer.h>
#include <ppapi/cpp/input_event.h>
#include <ppapi/cpp/graphics_3d.h>
#include <ppapi/lib/gl/gles2/gl2ext_ppapi.h>
#include <ppapi/utility/completion_callback_factory.h>
#include "client.h"
#include "render_gl.h"
#include <variant>
#include <string>
#include <vector>
#include <unordered_map>


// from https://github.com/Kagami/mpv.js/blob/master/index.cc
/*

Kagami/mpv.js is licensed under the

Creative Commons Zero v1.0 Universal
The Creative Commons CC0 Public Domain Dedication waives copyright interest in a work you've created and dedicates it to the world-wide public domain. Use CC0 to opt out of copyright entirely and ensure your work has the widest reach. As with the Unlicense and typical software licenses, CC0 disclaims warranties. CC0 is very similar to the Unlicense.

*/


// Fix for MSVS.
#ifdef PostMessage
#undef PostMessage
#endif

#define QUOTE(arg) #arg
#define DIE(msg) { fprintf(stderr, "%s\n", msg); return false; }
#define GLCB(name) { QUOTE(gl##name), reinterpret_cast<void*>(gl##name) }

using pp::Var;

static void dummyReadBuffer(GLenum) {}

// PPAPI GLES implementation doesn't provide getProcAddress.
static const std::unordered_map<std::string, void*> GL_CALLBACKS = {
  GLCB(GetString),
  GLCB(ActiveTexture),
  GLCB(AttachShader),
  GLCB(BindAttribLocation),
  GLCB(BindBuffer),
  GLCB(BindTexture),
  GLCB(BlendFuncSeparate),
  GLCB(BufferData),
  GLCB(BufferSubData),
  GLCB(Clear),
  GLCB(ClearColor),
  GLCB(CompileShader),
  GLCB(CreateProgram),
  GLCB(CreateShader),
  GLCB(DeleteBuffers),
  GLCB(DeleteProgram),
  GLCB(DeleteShader),
  GLCB(DeleteTextures),
  GLCB(Disable),
  GLCB(DisableVertexAttribArray),
  GLCB(DrawArrays),
  GLCB(Enable),
  GLCB(EnableVertexAttribArray),
  GLCB(Finish),
  GLCB(Flush),
  GLCB(GenBuffers),
  GLCB(GenTextures),
  GLCB(GetAttribLocation),
  GLCB(GetError),
  GLCB(GetIntegerv),
  GLCB(GetProgramInfoLog),
  GLCB(GetProgramiv),
  GLCB(GetShaderInfoLog),
  GLCB(GetShaderiv),
  GLCB(GetString),
  GLCB(GetUniformLocation),
  GLCB(LinkProgram),
  GLCB(PixelStorei),
  GLCB(ReadPixels),
  GLCB(Scissor),
  GLCB(ShaderSource),
  GLCB(TexImage2D),
  GLCB(TexParameteri),
  GLCB(TexSubImage2D),
  GLCB(Uniform1f),
  GLCB(Uniform2f),
  GLCB(Uniform3f),
  GLCB(Uniform1i),
  GLCB(UniformMatrix2fv),
  GLCB(UniformMatrix3fv),
  GLCB(UseProgram),
  GLCB(VertexAttribPointer),
  GLCB(Viewport),
  GLCB(BindFramebuffer),
  GLCB(GenFramebuffers),
  GLCB(DeleteFramebuffers),
  GLCB(CheckFramebufferStatus),
  GLCB(FramebufferTexture2D),
  GLCB(GetFramebufferAttachmentParameteriv),
  GLCB(GenQueriesEXT),
  GLCB(DeleteQueriesEXT),
  GLCB(BeginQueryEXT),
  GLCB(EndQueryEXT),
  // to make screenshot not crash (nullpoint)
  {"glReadBuffer", dummyReadBuffer},
  // Few functions are not available in PPAPI or doesn't work properly.
  {"glQueryCounterEXT", NULL},
  GLCB(IsQueryEXT),
  {"glGetQueryObjectivEXT", NULL},
  {"glGetQueryObjecti64vEXT", NULL},
  GLCB(GetQueryObjectuivEXT),
  {"glGetQueryObjectui64vEXT", NULL},
  {"glGetTranslatedShaderSourceANGLE", NULL}
};

// use stl type to manage mv_node memory
class NodeVarBase;

template <typename TBase>
class CppNodeT;

using NodeVar = CppNodeT<NodeVarBase>;

template <typename TBase>
class CppNodeT : public TBase {
private:
  typename TBase::InnerType internal_;

public:
  CppNodeT(const CppNodeT &) = delete;
  CppNodeT &operator=(const CppNodeT &) = delete;

  CppNodeT(const pp::Var &var) {
    construct(internal_, var);
    build(internal_);
  }

  CppNodeT(CppNodeT &&other) {
    internal_ = std::move(other.internal_);
    build(internal_);
  }

  CppNodeT &operator=(CppNodeT &&other) {
    internal_ = std::move(other.internal_);
    build(internal_);
    return *this;
  }
};

class ArrayVarBase {
  std::vector<mpv_node> _values; // represents mpv_node_list::values

protected:
  using InnerType = std::vector<NodeVar>;

  void construct(InnerType &, const pp::Var &);
  void build(const InnerType &);

public:
  mpv_node_list node; // represents mpv_node_list
};

class MapVarBase {
  std::vector<mpv_node> _values; // represents mpv_node_list::values
  std::vector<char*> _keys; // represents mpv_node_list::keys

protected:
  using InnerType = std::vector<std::pair<std::string, NodeVar>>;

  void construct(InnerType &, const pp::Var &);
  void build(const InnerType &);

public:
  mpv_node_list node; // represents mpv_node_list
};

class ByteArrayVarBase {
protected:
  using InnerType = std::vector<uint8_t>;

  void construct(InnerType &internal, const pp::Var &var) {
    pp::VarArrayBuffer array_buffer(var);
    char* bytes = static_cast<char*>(array_buffer.Map());
    uint32_t length = array_buffer.ByteLength();
    internal.resize(length);
    memcpy(&internal[0], bytes, length);
  }

  void build(const InnerType &internal) {
    node.data = (void*)(&internal[0]);
    node.size = internal.size();
  }

public:
  mpv_byte_array node; // represents mpv_byte_array
};

using ArrayVar = CppNodeT<ArrayVarBase>;
using MapVar = CppNodeT<MapVarBase>;
using ByteArrayVar = CppNodeT<ByteArrayVarBase>;

class NodeVarBase {
protected:
  using InnerType = std::variant<bool, int, double, std::string, ArrayVar, MapVar, ByteArrayVar>;

  void construct(InnerType &internal, const pp::Var &var) {
    if (var.is_array_buffer()) {
      internal = ByteArrayVar(var);
    } else if (var.is_array()) {
      internal = ArrayVar(var);
    } else if (var.is_dictionary() || var.is_object()) {
      internal = MapVar(var);
    } else if (var.is_string()) {
      std::string s = var.AsString();
      internal = s;
    } else if (var.is_bool()) {
      bool v = var.AsBool();
      internal = v;
    } else if (var.is_int()) {
      int v = var.AsInt();
      internal = v;
    } else if (var.is_double()) {
      double v = var.AsDouble();
      internal = v;
    }
  }

  void build(const InnerType &internal) {
    if (auto val = std::get_if<ArrayVar>(&internal)) {
      node.format = MPV_FORMAT_NODE_ARRAY;
      node.u.list = (mpv_node_list *)&val->node;
    }
    else if (auto val = std::get_if<MapVar>(&internal)) {
      node.format = MPV_FORMAT_NODE_MAP;
      node.u.list = (mpv_node_list *)&val->node;
    }
    else if (auto val = std::get_if<std::string>(&internal)) {
      node.format = MPV_FORMAT_STRING;
      node.u.string = (char *)val->c_str();
    }
    else if (auto val = std::get_if<bool>(&internal)) {
      node.format = MPV_FORMAT_FLAG;
      node.u.flag = (int)*val;
    }
    else if (auto val = std::get_if<int>(&internal)) {
      node.format = MPV_FORMAT_INT64;
      node.u.int64 = *val;
    }
    else if (auto val = std::get_if<double>(&internal)) {
      node.format = MPV_FORMAT_DOUBLE;
      node.u.double_ = *val;
    }
    else if (auto val = std::get_if<ByteArrayVar>(&internal)) {
      node.format = MPV_FORMAT_BYTE_ARRAY;
      node.u.ba = (mpv_byte_array *)&val->node;
    } else {
      node.format = MPV_FORMAT_NODE;
    }
  }

public:
  mpv_node node; // represents mpv_node
};

void ArrayVarBase::construct(InnerType &internal, const pp::Var &var) {
  pp::VarArray array(var);

  for (uint32_t i = 0; i < array.GetLength(); ++i) {
    auto node = array.Get(i);
    internal.push_back(NodeVar(node));
  }
}

void ArrayVarBase::build(const InnerType &internal) {
  _values.resize(internal.size());

  for (size_t i = 0; i < internal.size(); i++) {
    _values[i] = internal[i].node;
  }
  node.keys = nullptr;
  node.num = (int)_values.size();
  node.values = &_values[0];
}

void MapVarBase::construct(InnerType &internal, const pp::Var &var) {
  pp::VarDictionary dict(var);

  for (uint32_t i = 0; i < dict.GetKeys().GetLength(); ++i) {
    pp::Var key = dict.GetKeys().Get(i);
    auto node = dict.Get(key);

    internal.push_back({ key.AsString(), NodeVar(node) });
  }
}

void MapVarBase::build(const InnerType &internal) {
  size_t size = internal.size();

  _values.resize(size);
  _keys.resize(size);

  for (size_t i = 0; i < size; i++) {
    _keys[i] = (char*)internal[i].first.c_str();
    _values[i] = internal[i].second.node;
  }
  node.keys = &_keys[0];
  node.num = (int)_values.size();
  node.values = &_values[0];
}

static Var node_to_var(const mpv_node* node) {
  if (node->format == MPV_FORMAT_NONE) {
    return Var::Null();
  } else if (node->format == MPV_FORMAT_STRING) {
    return Var(node->u.string);
  } else if (node->format == MPV_FORMAT_FLAG) {
    return Var(static_cast<bool>(node->u.flag));
  } else if (node->format == MPV_FORMAT_INT64) {
    return Var(static_cast<int32_t>(node->u.int64));
  } else if (node->format == MPV_FORMAT_DOUBLE) {
    return Var(node->u.double_);
  } else if (node->format == MPV_FORMAT_NODE_ARRAY) {
    pp::VarArray objects;
    for (int idx = 0; idx < node->u.list->num; idx++) {
      objects.Set(idx, node_to_var(&node->u.list->values[idx]));
    }
    return objects;
  } else if (node->format == MPV_FORMAT_NODE_MAP) {
    pp::VarDictionary objects;
    for (int idx = 0; idx < node->u.list->num; idx++) {
      objects.Set(node->u.list->keys[idx], node_to_var(&node->u.list->values[idx]));
    }
    return objects;
  }

  return Var::Null();
}

static std::string var_to_string(const Var& value) {
  if (value.is_string()) {
    return value.AsString();
  } else if (value.is_bool()) {
    int value_bool = value.AsBool();
    return value_bool ? "yes" : "no";
  } else if (value.is_int()) {
    int64_t value_int = value.AsInt();
    return std::to_string(value_int);
  } else if (value.is_double()) {
    double value_double = value.AsDouble();
    return std::to_string(value_double);
  }
  return "";
}

// clone from mpv_event_to_node
static Var mpv_event_to_js(const mpv_event* event, const char* evname) {
  pp::VarDictionary dst;
  dst.Set("event", Var(evname));

  if (!event) {
    return dst;
  }

  if (event->error < 0) {
    dst.Set("error", Var(mpv_error_string(event->error)));
  }

  if (event->reply_userdata)
    dst.Set("id", Var(static_cast<int>(event->reply_userdata)));

  switch (event->event_id) {
    case MPV_EVENT_START_FILE: {
      mpv_event_start_file *esf = static_cast<mpv_event_start_file*>(event->data);
      dst.Set("playlist_entry_id", Var(static_cast<int>(esf->playlist_entry_id)));
      break;
    }

    case MPV_EVENT_END_FILE: {
      mpv_event_end_file *eef = static_cast<mpv_event_end_file*>(event->data);

      const char *reason;
      switch (eef->reason) {
        case MPV_END_FILE_REASON_EOF: reason = "eof"; break;
        case MPV_END_FILE_REASON_STOP: reason = "stop"; break;
        case MPV_END_FILE_REASON_QUIT: reason = "quit"; break;
        case MPV_END_FILE_REASON_ERROR: reason = "error"; break;
        case MPV_END_FILE_REASON_REDIRECT: reason = "redirect"; break;
        default:
          reason = "unknown";
      }
      dst.Set("reason", Var(reason));
      dst.Set("playlist_entry_id", Var(static_cast<int>(eef->playlist_entry_id)));

      if (eef->playlist_insert_id) {
          dst.Set("playlist_insert_id", Var(static_cast<int>(eef->playlist_insert_id)));
          dst.Set("playlist_insert_num_entries", Var(static_cast<int>(eef->playlist_insert_num_entries)));
      }

      if (eef->reason == MPV_END_FILE_REASON_ERROR) {
        dst.Set("file_error", Var(mpv_error_string(eef->error)));
      }

      break;
    }

    case MPV_EVENT_LOG_MESSAGE: {
      mpv_event_log_message *msg = static_cast<mpv_event_log_message*>(event->data);
      dst.Set("prefix", Var(msg->prefix));
      dst.Set("level", Var(msg->level));
      dst.Set("text", Var(msg->text));
      break;
    }

    case MPV_EVENT_CLIENT_MESSAGE: {
      mpv_event_client_message *msg = static_cast<mpv_event_client_message*>(event->data);
      pp::VarArray args;

      for (int n = 0; n < msg->num_args; n++) {
        args.Set(n, Var((char *)msg->args[n]));
      }
      break;
    }

    case MPV_EVENT_GET_PROPERTY_REPLY:
    case MPV_EVENT_PROPERTY_CHANGE: {
      mpv_event_property *prop = static_cast<mpv_event_property*>(event->data);

      dst.Set("name", Var(prop->name));
      switch (prop->format) {
        case MPV_FORMAT_NODE:
          dst.Set("data", node_to_var(static_cast<mpv_node*>(prop->data)));
          break;
        case MPV_FORMAT_DOUBLE:
          dst.Set("data", Var(*(double *)prop->data));
          break;
        case MPV_FORMAT_FLAG:
          dst.Set("data", Var(*(int *)prop->data));
          break;
        case MPV_FORMAT_STRING:
          dst.Set("data", Var(*(char **)prop->data));
          break;
        default:;
      }
      break;
    }

    case MPV_EVENT_COMMAND_REPLY: {
      mpv_event_command *cmd = static_cast<mpv_event_command*>(event->data);
      dst.Set("result", Var(node_to_var(&cmd->result)));
      break;
    }

    case MPV_EVENT_HOOK: {
      mpv_event_hook *hook = static_cast<mpv_event_hook*>(event->data);
      dst.Set("hook_id", Var(static_cast<int>(hook->id)));
      break;
    }
  }

  return dst;
}

class MPVInstance : public pp::Instance {
 public:
  explicit MPVInstance(PP_Instance instance)
      : pp::Instance(instance)
      , callback_factory_(this) {
    // RequestInputEvents(PP_INPUTEVENT_CLASS_MOUSE);
  }

  ~MPVInstance() override {
    if (mpv_gl_) {
      glSetCurrentContextPPAPI(context_.pp_resource());
      mpv_render_context_free(mpv_gl_);
    }
    mpv_terminate_destroy(mpv_);
  }

  bool Init(uint32_t argc, const char *argn[], const char *argv[]) override {
    bool result = InitGL() && InitMPV();

    pp::VarDictionary dict;
    dict.Set(pp::Var("type"), pp::Var("ready"));
    dict.Set(pp::Var("data"), Var(result));
    PostMessage(dict);
    return result;
  }

  void DidChangeView(const pp::View& view) override {
    int32_t new_width = static_cast<int32_t>(
        view.GetRect().width() * view.GetDeviceScale());
    int32_t new_height = static_cast<int32_t>(
        view.GetRect().height() * view.GetDeviceScale());
    // printf("@@@ RESIZE %d %d\n", new_width, new_height);

    // Always called on main thread so don't need locks.
    context_.ResizeBuffers(new_width, new_height);
    viewWidth_ = new_width;
    viewHeight_ = new_height;
    OnGetFrame(0);
  }

  /*
  bool HandleInputEvent(const pp::InputEvent& event) override {
    switch (event.GetType()) {
      case PP_INPUTEVENT_TYPE_MOUSEDOWN:
        printf("--------------------PP_INPUTEVENT_TYPE_MOUSEDOWN-----\n");
        return false;
      case PP_INPUTEVENT_TYPE_MOUSEMOVE:
        printf("--------------------PP_INPUTEVENT_TYPE_MOUSEMOVE-----\n");
        return false;
      default:
        return false;
    }
    return false;
  }
  */

  void HandleMessage(const Var& msg) override {
    pp::VarDictionary dict(msg);
    std::string type = dict.Get("type").AsString();
    pp::Var data = dict.Get("data");
    pp::Var var_id = dict.Get("id");
    const uint64_t id = var_id.is_number() ? (uint64_t)var_id.AsInt(): 0;

    if (type == "command") {
      if (data.is_string()) {
        // construct as node array
        pp::VarArray array;
        array.Set(0, data);

        NodeVar nodevar(array);
        int rc = mpv_command_node_async(mpv_, id, &nodevar.node);
        if (rc < 0) {
          PostCommandFail(id, rc, nullptr);
        }
      } else {
        NodeVar nodevar(data);
        
        if (nodevar.node.format == MPV_FORMAT_NONE) {
          PostCommandFail(id, -1, "bad command format");
        } else {
          int rc = mpv_command_node_async(mpv_, id, &nodevar.node);
          if (rc < 0) {
            PostCommandFail(id, rc, nullptr);
          }
        }
      }
    }  else if (type == "set_property") {
      pp::VarDictionary data_dict(data);
      std::string name = data_dict.Get("name").AsString();
      pp::Var value = data_dict.Get("value");
      if (value.is_string()) {
        std::string value_string = value.AsString();
        const char* value_cstr = value_string.c_str();
        mpv_set_property_async(mpv_, id, name.c_str(), MPV_FORMAT_STRING, &value_cstr);
      } else if (value.is_bool()) {
        int value_bool = value.AsBool();
        mpv_set_property_async(mpv_, id, name.c_str(), MPV_FORMAT_FLAG, &value_bool);
      } else if (value.is_int()) {
        int64_t value_int = value.AsInt();
        mpv_set_property_async(mpv_, id, name.c_str(), MPV_FORMAT_INT64, &value_int);
      } else if (value.is_double()) {
        double value_double = value.AsDouble();
        mpv_set_property_async(mpv_, id, name.c_str(), MPV_FORMAT_DOUBLE, &value_double);
      }
    } else if (type == "observe_property") {
      std::string name = data.AsString();
      mpv_observe_property(mpv_, id, name.c_str(), MPV_FORMAT_NODE);
    }  else if (type == "unobserve_property") {
      uint64_t id = data.AsInt();
      mpv_unobserve_property(mpv_, id);
    } else if (type == "get_property_async") {
      std::string name = data.AsString();
      mpv_get_property_async(mpv_, id, name.c_str(), MPV_FORMAT_NODE);
    } else if (type == "hook_continue") {
      mpv_hook_continue(mpv_, data.AsInt());
    } else if (type == "hook_add") {
      pp::VarDictionary data_dict(data);
      std::string name = data_dict.Get("name").AsString();
      uint64_t id = data_dict.Get("id").AsInt();
      int priority = data_dict.Get("priority").AsInt();
      mpv_hook_add(mpv_, id, name.c_str(), priority);
    } else if (type == "set_option") {
      pp::VarDictionary data_dict(data);
      std::string name = data_dict.Get("name").AsString();
      std::string value = data_dict.Get("value").AsString();
      mpv_set_option_string(mpv_, name.c_str(), value.c_str());
    }
  }

 private:
  static void* GetProcAddressMPV(void* fn_ctx, const char* name) {
    auto search = GL_CALLBACKS.find(name);
    if (search == GL_CALLBACKS.end()) {
      fprintf(stderr, "FIXME: missed GL function %s\n", name);
      return NULL;
    } else {
      return search->second;
    }
  }

  void HandleMPVEvents(int32_t) {
    for (;;) {
      mpv_event* event = mpv_wait_event(mpv_, 0);
      // printf("@@@ EVENT %d\n", event->event_id);
      if (event->event_id == MPV_EVENT_NONE) break;

      const char* evname = mpv_event_name(event->event_id);
      if (evname) {
        DispatchEvent(event, evname);
      }
    }
  }

  void DispatchEvent(mpv_event* event, const char* evname) {
    PostMessage(mpv_event_to_js(event, evname));
  }

  void PostCommandFail(uint64_t id, int code, const char* err) {
    pp::VarDictionary dst;
    dst.Set("event", Var("command-reply"));
    dst.Set("id", Var(static_cast<int>(id)));

    if (err) {
      dst.Set("error", Var(err));
    } else {
      dst.Set("error", Var(std::to_string(code)));
    }

    PostMessage(dst);
  }

  void PostDebugMsg(const std::string &msg) {
    pp::VarDictionary dst;
    dst.Set("error", Var(msg));

    PostMessage(dst);
  }

  static void HandleMPVWakeup(void* ctx) {
    auto self = static_cast<MPVInstance*>(ctx);
    self->CallOnMainThread(0, &MPVInstance::HandleMPVEvents);
  }

  static void HandleMPVUpdate(void* ctx) {
    auto self = static_cast<MPVInstance*>(ctx);
    self->InvokeGetFrame();
  }

  bool InitGL() {
    if (!glInitializePPAPI(pp::Module::Get()->get_browser_interface()))
      DIE("unable to initialize GL PPAPI");

    const int32_t attrib_list[] = {
      PP_GRAPHICS3DATTRIB_ALPHA_SIZE, 8,
      PP_GRAPHICS3DATTRIB_DEPTH_SIZE, 24,
      PP_GRAPHICS3DATTRIB_NONE
    };

    context_ = pp::Graphics3D(this, attrib_list);
    if (!BindGraphics(context_))
      DIE("unable to bind 3d context");

    return true;
  }

  bool InitMPV() {
    setlocale(LC_NUMERIC, "C");
    mpv_ = mpv_create();
    if (!mpv_)
      DIE("context init failed");

    char* terminal = getenv("MPVJS_TERMINAL");
    if (terminal && strlen(terminal))
      mpv_set_option_string(mpv_, "terminal", "yes");
    char* verbose = getenv("MPVJS_VERBOSE");
    if (verbose && strlen(verbose))
      mpv_set_option_string(mpv_, "msg-level", "all=v");

    // Can't be set after initialize in mpv 0.18.
    mpv_set_option_string(mpv_, "input-default-bindings", "yes");
    // mpv_set_option_string(mpv_, "pause", "yes");

    mpv_set_option_string(mpv_, "idle", "yes");

    if (mpv_initialize(mpv_) < 0)
      DIE("mpv init failed");

    glSetCurrentContextPPAPI(context_.pp_resource());

    mpv_opengl_init_params gl_init_params{GetProcAddressMPV, nullptr};
    mpv_render_param params[] = {
        {MPV_RENDER_PARAM_API_TYPE, const_cast<char *>(MPV_RENDER_API_TYPE_OPENGL)},
        {MPV_RENDER_PARAM_OPENGL_INIT_PARAMS, &gl_init_params},
        {MPV_RENDER_PARAM_INVALID, nullptr}
    };

    if (mpv_render_context_create(&mpv_gl_, mpv_, params) < 0)
      DIE("failed to initialize mpv GL context");

    // Some convenient defaults. Can be always changed on ready event.
    mpv_set_option_string(mpv_, "stop-playback-on-init-failure", "no");
    mpv_set_option_string(mpv_, "audio-file-auto", "no");
    mpv_set_option_string(mpv_, "sub-auto", "no");
    mpv_set_option_string(mpv_, "volume-max", "100");
    mpv_set_option_string(mpv_, "keep-open", "no");
    mpv_set_option_string(mpv_, "keep-open-pause", "no");
    mpv_set_option_string(mpv_, "osd-bar", "no");
    mpv_set_option_string(mpv_, "reset-on-next-file", "pause");

    mpv_set_option_string(mpv_, "force-window", "immediate");

    LoadMPV();
    return true;
  }

  void LoadMPV() {
    mpv_set_wakeup_callback(mpv_, HandleMPVWakeup, this);
    mpv_render_context_set_update_callback(mpv_gl_, HandleMPVUpdate, this);
  }

  mpv_handle* mpv_{nullptr};
  mpv_render_context* mpv_gl_{nullptr};

private:
  void InvokeGetFrame() {
    CallOnMainThread(0, &MPVInstance::OnGetFrame);
  }

  void OnGetFrame(int32_t) {
    // Always called on main thread so don't need locks.
    if (is_painting_) {
      needs_paint_ = true;
    } else {
      is_painting_ = true;
      needs_paint_ = false;
      Render();
    }
  }

  void Render() {
    glSetCurrentContextPPAPI(context_.pp_resource());

    mpv_opengl_fbo mpfbo{static_cast<int>(0), viewWidth_, viewHeight_, 0};
    int flip_y{1};
    mpv_render_param params[] = {
        {MPV_RENDER_PARAM_OPENGL_FBO, &mpfbo},
        {MPV_RENDER_PARAM_FLIP_Y, &flip_y},
        {MPV_RENDER_PARAM_INVALID, nullptr}
    };

    mpv_render_context_render(mpv_gl_, params);

    SwapBuffers();
  }

  void SwapBuffers() {
    context_.SwapBuffers(
        callback_factory_.NewCallback(&MPVInstance::PaintFinished));
  }

  void PaintFinished(int32_t) {
    is_painting_ = false;
    if (needs_paint_)
      OnGetFrame(0);
  }

  template <typename Method>
  void CallOnMainThread(int32_t delay_in_milliseconds,
                        Method method,
                        int32_t result = 0) {
    pp::Module::Get()->core()->CallOnMainThread(delay_in_milliseconds, 
        callback_factory_.NewCallback(method), result);
  }

private:
  pp::CompletionCallbackFactory<MPVInstance> callback_factory_;

  pp::Graphics3D context_;

  bool is_painting_{false};
  bool needs_paint_{false};

  int32_t viewWidth_{0};
  int32_t viewHeight_{0};
};

class MPVModule : public pp::Module {
 public:
  MPVModule() : pp::Module() {}
  virtual ~MPVModule() {}

  virtual pp::Instance* CreateInstance(PP_Instance instance) {
    return new MPVInstance(instance);
  }
};

namespace pp {
Module* CreateModule() {
  return new MPVModule();
}
}  // namespace pp
