"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Anim=Ops.Anim || {};
Ops.Gl.Phong=Ops.Gl.Phong || {};
Ops.Graphics=Ops.Graphics || {};
Ops.Graphics.Meshes=Ops.Graphics.Meshes || {};



// **************************************************************
// 
// Ops.Gl.ClearColor
// 
// **************************************************************

Ops.Gl.ClearColor= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    trigger = op.outTrigger("trigger"),
    r = op.inFloatSlider("r", 0.1),
    g = op.inFloatSlider("g", 0.1),
    b = op.inFloatSlider("b", 0.1),
    a = op.inFloatSlider("a", 1);

r.setUiAttribs({ "colorPick": true });

const cgl = op.patch.cgl;

render.onTriggered = function ()
{
    cgl.gl.clearColor(r.get(), g.get(), b.get(), a.get());
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    trigger.trigger();
};

}
};

CABLES.OPS["19b441eb-9f63-4f35-ba08-b87841517c4d"]={f:Ops.Gl.ClearColor,objName:"Ops.Gl.ClearColor"};




// **************************************************************
// 
// Ops.Gl.MainLoop_v2
// 
// **************************************************************

Ops.Gl.MainLoop_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    hdpi = op.inFloat("Max Pixel Density (DPR)", 2),
    fpsLimit = op.inValue("FPS Limit", 0),
    reduceFocusFPS = op.inValueBool("Reduce FPS unfocussed", false),
    clear = op.inValueBool("Transparent", false),
    active = op.inValueBool("Active", 1),
    inFocus = op.inValueBool("Focus canvas", 1),
    trigger = op.outTrigger("trigger"),
    width = op.outNumber("width"),
    height = op.outNumber("height"),
    outPixel = op.outNumber("Pixel Density");

op.onAnimFrame = render;
hdpi.onChange = updateHdpi;

const cgl = op.patch.cg = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;
let timeOutTest = null;
let addedListener = false;
if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

let firstTime = true;
let fsElement = null;
let winhasFocus = true;
let winVisible = true;

window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });

testMultiMainloop();

// op.patch.cgl.cgCanvas.forceAspect = 1.7777777;
op.patch.tempData.mainloopOp = this;

function updateHdpi()
{
    setPixelDensity();

    if (CABLES.UI)
    {
        if (hdpi.get() < 1)
            op.patch.cgl.canvas.style.imageRendering = "pixelated";
    }

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();
}

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

function getFpsLimit()
{
    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0.0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};

function setPixelDensity()
{
    if (hdpi.get() != 0) op.patch.cgl.pixelDensity = Math.min(hdpi.get(), window.devicePixelRatio);
    else op.patch.cgl.pixelDensity = window.devicePixelRatio;
}

function render(time)
{
    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    op.patch.cg = cgl;

    setPixelDensity();

    // if (hdpi.get())op.patch.cgl.pixelDensity = window.devicePixelRatio;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        width.set(cgl.canvasWidth / 1);
        height.set(cgl.canvasHeight / 1);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (!clear.get()) cgl.gl.clearColor(0, 0, 0, 1);
    else cgl.gl.clearColor(0, 0, 0, 0);

    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    op.patch.cg = null;

    if (!clear.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.tempData.phong)cgl.tempData.phong = {};
    rframes++;
    if (firstTime)
    {
        if (inFocus.get()) cgl.canvas.focus();
        firstTime = false;
    }

    outPixel.set(op.patch.cgl.pixelDensity);
    op.patch.cgl.profileData.profileMainloopMs = performance.now() - startTime;
}

function testMultiMainloop()
{
    clearTimeout(timeOutTest);
    timeOutTest = setTimeout(
        () =>
        {
            if (op.patch.getOpsByObjName(op.name).length > 1)
            {
                op.setUiError("multimainloop", "there should only be one mainloop op!");
                if (!addedListener)addedListener = op.patch.addEventListener("onOpDelete", testMultiMainloop);
            }
            else op.setUiError("multimainloop", null, 1);
        }, 500);
}

}
};

CABLES.OPS["f1029550-d877-42da-9b1e-63a5163a0350"]={f:Ops.Gl.MainLoop_v2,objName:"Ops.Gl.MainLoop_v2"};




// **************************************************************
// 
// Ops.Graphics.Meshes.Rectangle_v4
// 
// **************************************************************

Ops.Graphics.Meshes.Rectangle_v4= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    doRender = op.inValueBool("Render Mesh", true),
    width = op.inValue("width", 1),
    height = op.inValue("height", 1),
    pivotX = op.inSwitch("pivot x", ["left", "center", "right"], "center"),
    pivotY = op.inSwitch("pivot y", ["top", "center", "bottom"], "center"),
    axis = op.inSwitch("axis", ["xy", "xz"], "xy"),
    flipTcX = op.inBool("Flip TexCoord X", false),
    flipTcY = op.inBool("Flip TexCoord Y", true),
    nColumns = op.inValueInt("num columns", 1),
    nRows = op.inValueInt("num rows", 1),
    trigger = op.outTrigger("trigger"),
    geomOut = op.outObject("geometry", null, "geometry");

geomOut.ignoreValueSerialize = true;

const geom = new CGL.Geometry("rectangle");

doRender.setUiAttribs({ "title": "Render" });
render.setUiAttribs({ "title": "Trigger" });
trigger.setUiAttribs({ "title": "Next" });
op.setPortGroup("Pivot", [pivotX, pivotY, axis]);
op.setPortGroup("Size", [width, height]);
op.setPortGroup("Structure", [nColumns, nRows]);
op.toWorkPortsNeedToBeLinked(render);
op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_TRIGGER);

const AXIS_XY = 0;
const AXIS_XZ = 1;

let curAxis = AXIS_XY;
let mesh = null;
let needsRebuild = true;
let doScale = true;

const vScale = vec3.create();
vec3.set(vScale, 1, 1, 1);

axis.onChange =
    pivotX.onChange =
    pivotY.onChange =
    flipTcX.onChange =
    flipTcY.onChange =
    nRows.onChange =
    nColumns.onChange = rebuildLater;
updateScale();

width.onChange =
    height.onChange =
    () =>
    {
        if (doScale) updateScale();
        else needsRebuild = true;
    };

function updateScale()
{
    if (curAxis === AXIS_XY) vec3.set(vScale, width.get(), height.get(), 1);
    if (curAxis === AXIS_XZ) vec3.set(vScale, width.get(), 1, height.get());
}

geomOut.onLinkChanged = () =>
{
    doScale = !geomOut.isLinked();
    updateScale();
    needsRebuild = true;
};

function rebuildLater()
{
    needsRebuild = true;
}

render.onTriggered = () =>
{
    if (needsRebuild) rebuild();
    const cg = op.patch.cg;
    if (cg && mesh && doRender.get())
    {
        if (doScale)
        {
            cg.pushModelMatrix();
            mat4.scale(cg.mMatrix, cg.mMatrix, vScale);
        }

        mesh.render(cg.getShader());

        if (doScale) cg.popModelMatrix();
    }

    trigger.trigger();
};

op.onDelete = function () { if (mesh)mesh.dispose(); };

function rebuild()
{
    if (axis.get() == "xy") curAxis = AXIS_XY;
    if (axis.get() == "xz") curAxis = AXIS_XZ;

    updateScale();
    let w = width.get();
    let h = height.get();

    if (doScale) w = h = 1;

    let x = 0;
    let y = 0;

    if (pivotX.get() == "center") x = 0;
    else if (pivotX.get() == "right") x = -w / 2;
    else if (pivotX.get() == "left") x = +w / 2;

    if (pivotY.get() == "center") y = 0;
    else if (pivotY.get() == "top") y = -h / 2;
    else if (pivotY.get() == "bottom") y = +h / 2;

    const numRows = Math.max(1, Math.round(nRows.get()));
    const numColumns = Math.max(1, Math.round(nColumns.get()));

    const stepColumn = w / numColumns;
    const stepRow = h / numRows;

    const indices = [];
    const tc = new Float32Array((numColumns + 1) * (numRows + 1) * 2);
    const verts = new Float32Array((numColumns + 1) * (numRows + 1) * 3);
    const norms = new Float32Array((numColumns + 1) * (numRows + 1) * 3);
    const tangents = new Float32Array((numColumns + 1) * (numRows + 1) * 3);
    const biTangents = new Float32Array((numColumns + 1) * (numRows + 1) * 3);

    let idxTc = 0;
    let idxVert = 0;
    let idxNorms = 0;
    let idxTangent = 0;
    let idxBiTangent = 0;

    for (let r = 0; r <= numRows; r++)
    {
        for (let c = 0; c <= numColumns; c++)
        {
            verts[idxVert++] = c * stepColumn - w / 2 + x;
            if (curAxis == AXIS_XZ) verts[idxVert++] = 0;
            verts[idxVert++] = r * stepRow - h / 2 + y;

            if (curAxis == AXIS_XY)verts[idxVert++] = 0;

            tc[idxTc++] = c / numColumns;
            tc[idxTc++] = r / numRows;

            if (curAxis == AXIS_XY) // default
            {
                norms[idxNorms++] = 0;
                norms[idxNorms++] = 0;
                norms[idxNorms++] = 1;

                tangents[idxTangent++] = 1;
                tangents[idxTangent++] = 0;
                tangents[idxTangent++] = 0;

                biTangents[idxBiTangent++] = 0;
                biTangents[idxBiTangent++] = 1;
                biTangents[idxBiTangent++] = 0;
            }
            else if (curAxis == AXIS_XZ)
            {
                norms[idxNorms++] = 0;
                norms[idxNorms++] = 1;
                norms[idxNorms++] = 0;

                biTangents[idxBiTangent++] = 0;
                biTangents[idxBiTangent++] = 0;
                biTangents[idxBiTangent++] = 1;
            }
        }
    }

    indices.length = numColumns * numRows * 6;
    let idx = 0;

    for (let c = 0; c < numColumns; c++)
    {
        for (let r = 0; r < numRows; r++)
        {
            const ind = c + (numColumns + 1) * r;
            const v1 = ind;
            const v2 = ind + 1;
            const v3 = ind + numColumns + 1;
            const v4 = ind + 1 + numColumns + 1;

            if (curAxis == AXIS_XY) // default
            {
                indices[idx++] = v1;
                indices[idx++] = v2;
                indices[idx++] = v3;

                indices[idx++] = v3;
                indices[idx++] = v2;
                indices[idx++] = v4;
            }
            else
            if (curAxis == AXIS_XZ)
            {
                indices[idx++] = v1;
                indices[idx++] = v3;
                indices[idx++] = v2;

                indices[idx++] = v2;
                indices[idx++] = v3;
                indices[idx++] = v4;
            }
        }
    }

    if (flipTcY.get()) for (let i = 0; i < tc.length; i += 2)tc[i + 1] = 1.0 - tc[i + 1];
    if (flipTcX.get()) for (let i = 0; i < tc.length; i += 2)tc[i] = 1.0 - tc[i];

    geom.clear();
    geom.vertices = verts;
    geom.texCoords = tc;
    geom.verticesIndices = indices;
    geom.vertexNormals = norms;
    geom.tangents = tangents;
    geom.biTangents = biTangents;

    if (op.patch.cg)
        if (!mesh) mesh = op.patch.cg.createMesh(geom, { "opId": op.id });
        else mesh.setGeom(geom);

    geomOut.setRef(geom);
    needsRebuild = false;
}

}
};

CABLES.OPS["cc8c3ede-7103-410b-849f-a645793cab39"]={f:Ops.Graphics.Meshes.Rectangle_v4,objName:"Ops.Graphics.Meshes.Rectangle_v4"};




// **************************************************************
// 
// Ops.Anim.SineAnim
// 
// **************************************************************

Ops.Anim.SineAnim= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    exe = op.inTrigger("exe"),
    mode = op.inSwitch("Mode", ["Sine", "Cosine"], "Sine"),
    phase = op.inValueFloat("phase", 0),
    mul = op.inValueFloat("frequency", 1),
    amplitude = op.inValueFloat("amplitude", 1),
    trigOut = op.outTrigger("Trigger out"),
    result = op.outNumber("result");

let selectIndex = 0;
const SINE = 0;
const COSINE = 1;

op.toWorkPortsNeedToBeLinked(exe);

exe.onTriggered = exec;
mode.onChange = onModeChange;

exec();
onModeChange();

function onModeChange()
{
    let modeSelectValue = mode.get();

    if (modeSelectValue === "Sine") selectIndex = SINE;
    else if (modeSelectValue === "Cosine") selectIndex = COSINE;

    exec();
}

function exec()
{
    if (selectIndex == SINE) result.set(amplitude.get() * Math.sin((op.patch.freeTimer.get() * mul.get()) + phase.get()));
    else result.set(amplitude.get() * Math.cos((op.patch.freeTimer.get() * mul.get()) + phase.get()));
    trigOut.trigger();
}

}
};

CABLES.OPS["736d3d0e-c920-449e-ade0-f5ca6018fb5c"]={f:Ops.Anim.SineAnim,objName:"Ops.Anim.SineAnim"};




// **************************************************************
// 
// Ops.Gl.Phong.PhongMaterial_v6
// 
// **************************************************************

Ops.Gl.Phong.PhongMaterial_v6= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={"phong_frag":"IN vec3 viewDirection;\r\nIN vec3 normInterpolated;\r\nIN vec2 texCoord;\r\n\r\n#ifdef AO_CHAN_1\r\n    #ifndef ATTRIB_texCoord1\r\n        #define ATTRIB_texCoord1\r\n\r\n        IN vec2 texCoord1;\r\n    #endif\r\n#endif\r\n\r\n#ifdef HAS_TEXTURE_AO\r\nvec2 tcAo;\r\n#endif\r\n\r\n\r\n\r\n#ifdef ENABLE_FRESNEL\r\n    IN vec4 cameraSpace_pos;\r\n#endif\r\n\r\n// IN mat3 normalMatrix; // when instancing...\r\n\r\n#ifdef HAS_TEXTURE_NORMAL\r\n    IN mat3 TBN_Matrix; // tangent bitangent normal space transform matrix\r\n#endif\r\n\r\nIN vec3 fragPos;\r\nIN vec3 v_viewDirection;\r\n\r\nUNI vec4 inDiffuseColor;\r\nUNI vec4 inMaterialProperties;\r\n\r\n#ifdef ADD_EMISSIVE_COLOR\r\n    UNI vec4 inEmissiveColor; // .w = intensity\r\n#endif\r\n\r\n#ifdef ENABLE_FRESNEL\r\n    UNI mat4 viewMatrix;\r\n    UNI vec4 inFresnel;\r\n    UNI vec2 inFresnelWidthExponent;\r\n#endif\r\n\r\n#ifdef ENVMAP_MATCAP\r\n    IN vec3 viewSpaceNormal;\r\n    IN vec3 viewSpacePosition;\r\n#endif\r\n\r\nstruct Light {\r\n    vec3 color;\r\n    vec3 position;\r\n    vec3 specular;\r\n\r\n\r\n    // * SPOT LIGHT * //\r\n    #ifdef HAS_SPOT\r\n        vec3 conePointAt;\r\n        #define COSCONEANGLE x\r\n        #define COSCONEANGLEINNER y\r\n        #define SPOTEXPONENT z\r\n        vec3 spotProperties;\r\n    #endif\r\n\r\n    #define INTENSITY x\r\n    #define ATTENUATION y\r\n    #define FALLOFF z\r\n    #define RADIUS w\r\n    vec4 lightProperties;\r\n\r\n    int castLight;\r\n};\r\n\r\n/* CONSTANTS */\r\n#define NONE -1\r\n#define ALBEDO x\r\n#define ROUGHNESS y\r\n#define SHININESS z\r\n#define SPECULAR_AMT w\r\n#define NORMAL x\r\n#define AO y\r\n#define SPECULAR z\r\n#define EMISSIVE w\r\nconst float PI = 3.1415926535897932384626433832795;\r\nconst float TWO_PI = (2. * PI);\r\nconst float EIGHT_PI = (8. * PI);\r\n\r\n#define RECIPROCAL_PI 1./PI\r\n#define RECIPROCAL_PI2 RECIPROCAL_PI/2.\r\n\r\n// TEXTURES\r\n// #ifdef HAS_TEXTURES\r\n    UNI vec4 inTextureIntensities;\r\n\r\n    #ifdef HAS_TEXTURE_ENV\r\n        #ifdef TEX_FORMAT_CUBEMAP\r\n            UNI samplerCube texEnv;\r\n            #ifndef WEBGL1\r\n                #define SAMPLETEX textureLod\r\n            #endif\r\n            #ifdef WEBGL1\r\n                #define SAMPLETEX textureCubeLodEXT\r\n            #endif\r\n        #endif\r\n\r\n        #ifdef TEX_FORMAT_EQUIRECT\r\n            UNI sampler2D texEnv;\r\n            #ifdef WEBGL1\r\n                // #extension GL_EXT_shader_texture_lod : enable\r\n                #ifdef GL_EXT_shader_texture_lod\r\n                    #define textureLod texture2DLodEXT\r\n                #endif\r\n                // #define textureLod texture2D\r\n            #endif\r\n\r\n            #define SAMPLETEX sampleEquirect\r\n\r\n            const vec2 invAtan = vec2(0.1591, 0.3183);\r\n            vec4 sampleEquirect(sampler2D tex,vec3 direction,float lod)\r\n            {\r\n                #ifndef WEBGL1\r\n                    vec3 newDirection = normalize(direction);\r\n            \t\tvec2 sampleUV;\r\n            \t\tsampleUV.x = -1. * (atan( direction.z, direction.x ) * RECIPROCAL_PI2 + 0.75);\r\n            \t\tsampleUV.y = asin( clamp(direction.y, -1., 1.) ) * RECIPROCAL_PI + 0.5;\r\n                #endif\r\n\r\n                #ifdef WEBGL1\r\n                    vec3 newDirection = normalize(direction);\r\n                \t\tvec2 sampleUV = vec2(atan(newDirection.z, newDirection.x), asin(newDirection.y+1e-6));\r\n                        sampleUV *= vec2(0.1591, 0.3183);\r\n                        sampleUV += 0.5;\r\n                #endif\r\n                return textureLod(tex, sampleUV, lod);\r\n            }\r\n        #endif\r\n        #ifdef ENVMAP_MATCAP\r\n            UNI sampler2D texEnv;\r\n            #ifdef WEBGL1\r\n                // #extension GL_EXT_shader_texture_lod : enable\r\n                #ifdef GL_EXT_shader_texture_lod\r\n                    #define textureLod texture2DLodEXT\r\n                #endif\r\n                // #define textureLod texture2D\r\n            #endif\r\n\r\n\r\n            // * taken & modified from https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshmatcap_frag.glsl.js\r\n            vec2 getMatCapUV(vec3 viewSpacePosition, vec3 viewSpaceNormal) {\r\n                vec3 viewDir = normalize(-viewSpacePosition);\r\n            \tvec3 x = normalize(vec3(viewDir.z, 0.0, - viewDir.x));\r\n            \tvec3 y = normalize(cross(viewDir, x));\r\n            \tvec2 uv = vec2(dot(x, viewSpaceNormal), dot(y, viewSpaceNormal)) * 0.495 + 0.5; // 0.495 to remove artifacts caused by undersized matcap disks\r\n            \treturn uv;\r\n            }\r\n        #endif\r\n\r\n        UNI float inEnvMapIntensity;\r\n        UNI float inEnvMapWidth;\r\n    #endif\r\n\r\n    #ifdef HAS_TEXTURE_LUMINANCE_MASK\r\n        UNI sampler2D texLuminance;\r\n        UNI float inLuminanceMaskIntensity;\r\n    #endif\r\n\r\n    #ifdef HAS_TEXTURE_DIFFUSE\r\n        UNI sampler2D texDiffuse;\r\n    #endif\r\n\r\n    #ifdef HAS_TEXTURE_SPECULAR\r\n        UNI sampler2D texSpecular;\r\n    #endif\r\n\r\n    #ifdef HAS_TEXTURE_NORMAL\r\n        UNI sampler2D texNormal;\r\n    #endif\r\n\r\n    #ifdef HAS_TEXTURE_AO\r\n        UNI sampler2D texAO;\r\n    #endif\r\n\r\n    #ifdef HAS_TEXTURE_EMISSIVE\r\n        UNI sampler2D texEmissive;\r\n    #endif\r\n\r\n    #ifdef HAS_TEXTURE_EMISSIVE_MASK\r\n        UNI sampler2D texMaskEmissive;\r\n        UNI float inEmissiveMaskIntensity;\r\n    #endif\r\n    #ifdef HAS_TEXTURE_ALPHA\r\n        UNI sampler2D texAlpha;\r\n    #endif\r\n// #endif\r\n\r\n{{MODULES_HEAD}}\r\n\r\nfloat when_gt(float x, float y) { return max(sign(x - y), 0.0); } // comparator function\r\nfloat when_lt(float x, float y) { return max(sign(y - x), 0.0); }\r\nfloat when_eq(float x, float y) { return 1. - abs(sign(x - y)); } // comparator function\r\nfloat when_neq(float x, float y) { return abs(sign(x - y)); } // comparator function\r\nfloat when_ge(float x, float y) { return 1.0 - when_lt(x, y); }\r\nfloat when_le(float x, float y) { return 1.0 - when_gt(x, y); }\r\n\r\n#ifdef FALLOFF_MODE_A\r\n    float CalculateFalloff(float distance, vec3 lightDirection, float falloff, float radius) {\r\n        // * original falloff\r\n        float denom = distance / radius + 1.0;\r\n        float attenuation = 1.0 / (denom*denom);\r\n        float t = (attenuation - falloff) / (1.0 - falloff);\r\n        return max(t, 0.0);\r\n    }\r\n#endif\r\n\r\n#ifdef FALLOFF_MODE_B\r\n    float CalculateFalloff(float distance, vec3 lightDirection, float falloff, float radius) {\r\n        float distanceSquared = dot(lightDirection, lightDirection);\r\n        float factor = distanceSquared * falloff;\r\n        float smoothFactor = clamp(1. - factor * factor, 0., 1.);\r\n        float attenuation = smoothFactor * smoothFactor;\r\n\r\n        return attenuation * 1. / max(distanceSquared, 0.00001);\r\n    }\r\n#endif\r\n\r\n#ifdef FALLOFF_MODE_C\r\n    float CalculateFalloff(float distance, vec3 lightDirection, float falloff, float radius) {\r\n        // https://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf\r\n        float falloffNumerator = 1. - pow(distance/radius, 4.);\r\n        falloffNumerator = clamp(falloffNumerator, 0., 1.);\r\n        falloffNumerator *= falloffNumerator;\r\n\r\n        float denominator = distance*distance + falloff;\r\n\r\n        return falloffNumerator/denominator;\r\n    }\r\n#endif\r\n\r\n#ifdef FALLOFF_MODE_D\r\n    float CalculateFalloff(float distance, vec3 lightDirection, float falloff, float radius) {\r\n        // inverse square falloff, \"physically correct\"\r\n        return 1.0 / max(distance * distance, 0.0001);\r\n    }\r\n#endif\r\n\r\n#ifdef ENABLE_FRESNEL\r\n    float CalculateFresnel(vec3 direction, vec3 normal)\r\n    {\r\n        vec3 nDirection = normalize( direction );\r\n        vec3 nNormal = normalize( mat3(viewMatrix) * normal );\r\n        vec3 halfDirection = normalize( nNormal + nDirection );\r\n\r\n        float cosine = dot( halfDirection, nDirection );\r\n        float product = max( cosine, 0.0 );\r\n        float factor = pow(product, inFresnelWidthExponent.y);\r\n\r\n        return 5. * factor;\r\n    }\r\n#endif\r\n\r\n#ifdef CONSERVE_ENERGY\r\n    // http://www.rorydriscoll.com/2009/01/25/energy-conservation-in-games/\r\n    // http://www.farbrausch.de/~fg/articles/phong.pdf\r\n    float EnergyConservation(float shininess) {\r\n        #ifdef SPECULAR_PHONG\r\n            return (shininess + 2.)/TWO_PI;\r\n        #endif\r\n        #ifdef SPECULAR_BLINN\r\n            return (shininess + 8.)/EIGHT_PI;\r\n        #endif\r\n\r\n        #ifdef SPECULAR_SCHLICK\r\n            return (shininess + 8.)/EIGHT_PI;\r\n        #endif\r\n\r\n        #ifdef SPECULAR_GAUSS\r\n            return (shininess + 8.)/EIGHT_PI;\r\n        #endif\r\n    }\r\n#endif\r\n\r\n#ifdef ENABLE_OREN_NAYAR_DIFFUSE\r\n    float CalculateOrenNayar(vec3 lightDirection, vec3 viewDirection, vec3 normal) {\r\n        float LdotV = dot(lightDirection, viewDirection);\r\n        float NdotL = dot(lightDirection, normal);\r\n        float NdotV = dot(normal, viewDirection);\r\n\r\n        float albedo = inMaterialProperties.ALBEDO;\r\n        albedo *= 1.8;\r\n        float s = LdotV - NdotL * NdotV;\r\n        float t = mix(1., max(NdotL, NdotV), step(0., s));\r\n\r\n        float roughness = inMaterialProperties.ROUGHNESS;\r\n        float sigma2 = roughness * roughness;\r\n        float A = 1. + sigma2 * (albedo / (sigma2 + 0.13) + 0.5 / (sigma2 + 0.33));\r\n        float B = 0.45 * sigma2 / (sigma2 + 0.09);\r\n\r\n        float factor = albedo * max(0., NdotL) * (A + B * s / t) / PI;\r\n\r\n        return factor;\r\n\r\n    }\r\n#endif\r\n\r\nvec3 CalculateDiffuseColor(\r\n    vec3 lightDirection,\r\n    vec3 viewDirection,\r\n    vec3 normal,\r\n    vec3 lightColor,\r\n    vec3 materialColor,\r\n    inout float lambert\r\n) {\r\n    #ifndef ENABLE_OREN_NAYAR_DIFFUSE\r\n        lambert = clamp(dot(lightDirection, normal), 0., 1.);\r\n    #endif\r\n\r\n    #ifdef ENABLE_OREN_NAYAR_DIFFUSE\r\n        lambert = CalculateOrenNayar(lightDirection, viewDirection, normal);\r\n    #endif\r\n\r\n    vec3 diffuseColor = lambert * lightColor * materialColor;\r\n    return diffuseColor;\r\n}\r\n\r\nvec3 CalculateSpecularColor(\r\n    vec3 specularColor,\r\n    float specularCoefficient,\r\n    float shininess,\r\n    vec3 lightDirection,\r\n    vec3 viewDirection,\r\n    vec3 normal,\r\n    float lambertian\r\n) {\r\n    vec3 resultColor = vec3(0.);\r\n\r\n    #ifdef SPECULAR_PHONG\r\n        vec3 reflectDirection = reflect(-lightDirection, normal);\r\n        float specularAngle = max(dot(reflectDirection, viewDirection), 0.);\r\n        float specularFactor = pow(specularAngle, max(0., shininess));\r\n    resultColor = lambertian * specularFactor * specularCoefficient * specularColor;\r\n    #endif\r\n\r\n    #ifdef SPECULAR_BLINN\r\n        vec3 halfDirection = normalize(lightDirection + viewDirection);\r\n        float specularAngle = max(dot(halfDirection, normal), 0.);\r\n        float specularFactor = pow(specularAngle, max(0., shininess));\r\n        resultColor = lambertian * specularFactor * specularCoefficient * specularColor;\r\n    #endif\r\n\r\n    #ifdef SPECULAR_SCHLICK\r\n        vec3 halfDirection = normalize(lightDirection + viewDirection);\r\n        float specularAngle = dot(halfDirection, normal);\r\n        float schlickShininess = max(0., shininess);\r\n        float specularFactor = specularAngle / (schlickShininess - schlickShininess*specularAngle + specularAngle);\r\n        resultColor = lambertian * specularFactor * specularCoefficient * specularColor;\r\n    #endif\r\n\r\n    #ifdef SPECULAR_GAUSS\r\n        vec3 halfDirection = normalize(lightDirection + viewDirection);\r\n        float specularAngle = acos(max(dot(halfDirection, normal), 0.));\r\n        float exponent = specularAngle * shininess * 0.17;\r\n        exponent = -(exponent*exponent);\r\n        float specularFactor = exp(exponent);\r\n\r\n        resultColor = lambertian * specularFactor * specularCoefficient * specularColor;\r\n    #endif\r\n\r\n    #ifdef CONSERVE_ENERGY\r\n        float conserveEnergyFactor = EnergyConservation(shininess);\r\n        resultColor = conserveEnergyFactor * resultColor;\r\n    #endif\r\n\r\n    return resultColor;\r\n}\r\n\r\n#ifdef HAS_SPOT\r\n    float CalculateSpotLightEffect(vec3 lightPosition, vec3 conePointAt, float cosConeAngle, float cosConeAngleInner, float spotExponent, vec3 lightDirection) {\r\n        vec3 spotLightDirection = normalize(lightPosition-conePointAt);\r\n        float spotAngle = dot(-lightDirection, spotLightDirection);\r\n        float epsilon = cosConeAngle - cosConeAngleInner;\r\n\r\n        float spotIntensity = clamp((spotAngle - cosConeAngle)/epsilon, 0.0, 1.0);\r\n        spotIntensity = pow(spotIntensity, max(0.01, spotExponent));\r\n\r\n        return max(0., spotIntensity);\r\n    }\r\n#endif\r\n\r\n\r\n\r\n{{PHONG_FRAGMENT_HEAD}}\r\n\r\n\r\nvoid main()\r\n{\r\n    {{MODULE_BEGIN_FRAG}}\r\n\r\n    vec4 col=vec4(0., 0., 0., inDiffuseColor.a);\r\n    vec3 calculatedColor = vec3(0.);\r\n    vec3 normal = normalize(normInterpolated);\r\n    vec3 baseColor = inDiffuseColor.rgb;\r\n\r\n    {{MODULE_BASE_COLOR}}\r\n\r\n\r\n\r\n    #ifdef AO_CHAN_0\r\n        vec2 tcAo=texCoord;\r\n    #endif\r\n    #ifdef AO_CHAN_1\r\n        vec2 tcAo=texCoord1;\r\n    #endif\r\n\r\n\r\n    vec3 viewDirection = normalize(v_viewDirection);\r\n\r\n    #ifdef DOUBLE_SIDED\r\n        if(!gl_FrontFacing) normal = normal * -1.0;\r\n    #endif\r\n\r\n    #ifdef HAS_TEXTURES\r\n        #ifdef HAS_TEXTURE_DIFFUSE\r\n            baseColor = texture(texDiffuse, texCoord).rgb;\r\n\r\n            #ifdef COLORIZE_TEXTURE\r\n                baseColor *= inDiffuseColor.rgb;\r\n            #endif\r\n        #endif\r\n\r\n        #ifdef HAS_TEXTURE_NORMAL\r\n            normal = texture(texNormal, texCoord).rgb;\r\n            normal = normalize(normal * 2. - 1.);\r\n            float normalIntensity = inTextureIntensities.NORMAL;\r\n            normal = normalize(mix(vec3(0., 0., 1.), normal, 2. * normalIntensity));\r\n            normal = normalize(TBN_Matrix * normal);\r\n        #endif\r\n    #endif\r\n\r\n    {{PHONG_FRAGMENT_BODY}}\r\n\r\n\r\n\r\n\r\n\r\n\r\n    #ifdef ENABLE_FRESNEL\r\n        calculatedColor += inFresnel.rgb * (CalculateFresnel(vec3(cameraSpace_pos), normal) * inFresnel.w * inFresnelWidthExponent.x);\r\n    #endif\r\n\r\n     #ifdef HAS_TEXTURE_ALPHA\r\n        #ifdef ALPHA_MASK_ALPHA\r\n            col.a*=texture(texAlpha,texCoord).a;\r\n        #endif\r\n        #ifdef ALPHA_MASK_LUMI\r\n            col.a*= dot(vec3(0.2126,0.7152,0.0722), texture(texAlpha,texCoord).rgb);\r\n        #endif\r\n        #ifdef ALPHA_MASK_R\r\n            col.a*=texture(texAlpha,texCoord).r;\r\n        #endif\r\n        #ifdef ALPHA_MASK_G\r\n            col.a*=texture(texAlpha,texCoord).g;\r\n        #endif\r\n        #ifdef ALPHA_MASK_B\r\n            col.a*=texture(texAlpha,texCoord).b;\r\n        #endif\r\n    #endif\r\n\r\n    #ifdef DISCARDTRANS\r\n        if(col.a<0.2) discard;\r\n    #endif\r\n\r\n\r\n    #ifdef HAS_TEXTURE_ENV\r\n        vec3 luminanceColor = vec3(0.);\r\n\r\n        #ifndef ENVMAP_MATCAP\r\n            float environmentMapWidth = inEnvMapWidth;\r\n            float glossyExponent = inMaterialProperties.SHININESS;\r\n            float glossyCoefficient = inMaterialProperties.SPECULAR_AMT;\r\n\r\n            vec3 envMapNormal =  normal;\r\n            vec3 reflectDirection = reflect(normalize(-viewDirection), normal);\r\n\r\n            float lambertianCoefficient = dot(viewDirection, reflectDirection); //0.44; // TODO: need prefiltered map for this\r\n            // lambertianCoefficient = 1.;\r\n            float specularAngle = max(dot(reflectDirection, viewDirection), 0.);\r\n            float specularFactor = pow(specularAngle, max(0., inMaterialProperties.SHININESS));\r\n\r\n            glossyExponent = specularFactor;\r\n\r\n            float maxMIPLevel = 10.;\r\n            float MIPlevel = log2(environmentMapWidth / 1024. * sqrt(3.)) - 0.5 * log2(glossyExponent + 1.);\r\n\r\n            luminanceColor = inEnvMapIntensity * (\r\n                inDiffuseColor.rgb *\r\n                SAMPLETEX(texEnv, envMapNormal, maxMIPLevel).rgb\r\n                +\r\n                glossyCoefficient * SAMPLETEX(texEnv, reflectDirection, MIPlevel).rgb\r\n            );\r\n        #endif\r\n        #ifdef ENVMAP_MATCAP\r\n            luminanceColor = inEnvMapIntensity * (\r\n                texture(texEnv, getMatCapUV(viewSpacePosition, viewSpaceNormal)).rgb\r\n                //inDiffuseColor.rgb\r\n                //* textureLod(texEnv, getMatCapUV(envMapNormal), maxMIPLevel).rgb\r\n                //+\r\n                //glossyCoefficient * textureLod(texEnv, getMatCapUV(reflectDirection), MIPlevel).rgb\r\n            );\r\n        #endif\r\n\r\n\r\n\r\n        #ifdef HAS_TEXTURE_LUMINANCE_MASK\r\n            luminanceColor *= texture(texLuminance, texCoord).r * inLuminanceMaskIntensity;\r\n        #endif\r\n\r\n        #ifdef HAS_TEXTURE_AO\r\n            luminanceColor *= texture(texAO, tcAo).r*inTextureIntensities.AO;\r\n        #endif\r\n\r\n        #ifdef ENV_BLEND_ADD\r\n            calculatedColor.rgb += luminanceColor;\r\n        #endif\r\n        #ifdef ENV_BLEND_MUL\r\n            calculatedColor.rgb *= luminanceColor;\r\n        #endif\r\n\r\n        #ifdef ENV_BLEND_MIX\r\n            calculatedColor.rgb=mix(luminanceColor,calculatedColor.rgb,luminanceColor);\r\n        #endif\r\n\r\n\r\n    #endif\r\n\r\n    #ifdef ADD_EMISSIVE_COLOR\r\n        vec3 emissiveRadiance = mix(calculatedColor, inEmissiveColor.rgb, inEmissiveColor.w); // .w = intensity of color;\r\n\r\n        #ifdef HAS_TEXTURE_EMISSIVE\r\n            float emissiveIntensity = inTextureIntensities.EMISSIVE;\r\n            emissiveRadiance = mix(calculatedColor, texture(texEmissive, texCoord).rgb, emissiveIntensity);\r\n        #endif\r\n\r\n        #ifdef HAS_TEXTURE_EMISSIVE_MASK\r\n           float emissiveMixValue = mix(1., texture(texMaskEmissive, texCoord).r, inEmissiveMaskIntensity);\r\n           calculatedColor = mix(calculatedColor, emissiveRadiance, emissiveMixValue);\r\n        #endif\r\n\r\n        #ifndef HAS_TEXTURE_EMISSIVE_MASK\r\n            calculatedColor = emissiveRadiance;\r\n        #endif\r\n    #endif\r\n\r\n    col.rgb = clamp(calculatedColor, 0., 1.);\r\n\r\n\r\n    {{MODULE_COLOR}}\r\n\r\n    outColor = col;\r\n\r\n}\r\n","phong_vert":"\r\n{{MODULES_HEAD}}\r\n\r\n#define NONE -1\r\n#define AMBIENT 0\r\n#define POINT 1\r\n#define DIRECTIONAL 2\r\n#define SPOT 3\r\n\r\n#define TEX_REPEAT_X x;\r\n#define TEX_REPEAT_Y y;\r\n#define TEX_OFFSET_X z;\r\n#define TEX_OFFSET_Y w;\r\n\r\nIN vec3 vPosition;\r\nIN vec2 attrTexCoord;\r\nIN vec3 attrVertNormal;\r\nIN float attrVertIndex;\r\nIN vec3 attrTangent;\r\nIN vec3 attrBiTangent;\r\n\r\nOUT vec2 texCoord;\r\nOUT vec3 normInterpolated;\r\nOUT vec3 fragPos;\r\n\r\n#ifdef AO_CHAN_1\r\n    #ifndef ATTRIB_attrTexCoord1\r\n        IN vec2 attrTexCoord1;\r\n        OUT vec2 texCoord1;\r\n        #define ATTRIB_attrTexCoord1\r\n        #define ATTRIB_texCoord1\r\n    #endif\r\n#endif\r\n\r\n#ifdef HAS_TEXTURE_NORMAL\r\n    OUT mat3 TBN_Matrix; // tangent bitangent normal space transform matrix\r\n#endif\r\n\r\n#ifdef ENABLE_FRESNEL\r\n    OUT vec4 cameraSpace_pos;\r\n#endif\r\n\r\nOUT vec3 v_viewDirection;\r\nOUT mat3 normalMatrix;\r\nOUT mat4 mvMatrix;\r\n\r\n#ifdef HAS_TEXTURES\r\n    UNI vec4 inTextureRepeatOffset;\r\n#endif\r\n\r\nUNI vec3 camPos;\r\nUNI mat4 projMatrix;\r\nUNI mat4 viewMatrix;\r\nUNI mat4 modelMatrix;\r\n\r\n#ifdef ENVMAP_MATCAP\r\n    OUT vec3 viewSpaceNormal;\r\n    OUT vec3 viewSpacePosition;\r\n#endif\r\n\r\n\r\nmat3 transposeMat3(mat3 m)\r\n{\r\n    return mat3(m[0][0], m[1][0], m[2][0],\r\n        m[0][1], m[1][1], m[2][1],\r\n        m[0][2], m[1][2], m[2][2]);\r\n}\r\n\r\nmat3 inverseMat3(mat3 m)\r\n{\r\n    float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];\r\n    float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];\r\n    float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];\r\n\r\n    float b01 = a22 * a11 - a12 * a21;\r\n    float b11 = -a22 * a10 + a12 * a20;\r\n    float b21 = a21 * a10 - a11 * a20;\r\n\r\n    float det = a00 * b01 + a01 * b11 + a02 * b21;\r\n\r\n    return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),\r\n        b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),\r\n        b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;\r\n}\r\n\r\nvoid main()\r\n{\r\n    mat4 mMatrix=modelMatrix;\r\n    vec4 pos=vec4(vPosition,  1.0);\r\n\r\n    texCoord=attrTexCoord;\r\n    texCoord.y = 1. - texCoord.y;\r\n\r\n    #ifdef ATTRIB_texCoord1\r\n        texCoord1=attrTexCoord1;\r\n    #endif\r\n\r\n    vec3 norm=attrVertNormal;\r\n    vec3 tangent = attrTangent;\r\n    vec3 bitangent = attrBiTangent;\r\n\r\n    {{MODULE_VERTEX_POSITION}}\r\n\r\n    normalMatrix = transposeMat3(inverseMat3(mat3(mMatrix)));\r\n    mvMatrix = (viewMatrix * mMatrix);\r\n\r\n\r\n\r\n    #ifdef ENABLE_FRESNEL\r\n        cameraSpace_pos = mvMatrix * pos;\r\n    #endif\r\n\r\n    #ifdef HAS_TEXTURES\r\n        float repeatX = inTextureRepeatOffset.TEX_REPEAT_X;\r\n        float offsetX = inTextureRepeatOffset.TEX_OFFSET_X;\r\n        float repeatY = inTextureRepeatOffset.TEX_REPEAT_Y;\r\n        float offsetY = inTextureRepeatOffset.TEX_OFFSET_Y;\r\n\r\n        texCoord.x *= repeatX;\r\n        texCoord.x += offsetX;\r\n        texCoord.y *= repeatY;\r\n        texCoord.y += offsetY;\r\n    #endif\r\n\r\n   normInterpolated = vec3(normalMatrix*norm);\r\n\r\n    #ifdef HAS_TEXTURE_NORMAL\r\n        vec3 normCameraSpace = normalize((vec4(normInterpolated, 0.0)).xyz);\r\n        vec3 tangCameraSpace = normalize((mMatrix * vec4(tangent, 0.0)).xyz);\r\n        vec3 bitangCameraSpace = normalize((mMatrix * vec4(bitangent, 0.0)).xyz);\r\n\r\n        // re orthogonalization for smoother normals\r\n        tangCameraSpace = normalize(tangCameraSpace - dot(tangCameraSpace, normCameraSpace) * normCameraSpace);\r\n        bitangCameraSpace = cross(normCameraSpace, tangCameraSpace);\r\n\r\n        TBN_Matrix = mat3(tangCameraSpace, bitangCameraSpace, normCameraSpace);\r\n    #endif\r\n\r\n    fragPos = vec3((mMatrix) * pos);\r\n    v_viewDirection = normalize(camPos - fragPos);\r\n    // modelPos=mMatrix*pos;\r\n\r\n    #ifdef ENVMAP_MATCAP\r\n        mat3 viewSpaceNormalMatrix = normalMatrix = transposeMat3(inverseMat3(mat3(mvMatrix)));\r\n        viewSpaceNormal = normalize(viewSpaceNormalMatrix * norm);\r\n        viewSpacePosition = vec3(mvMatrix * pos);\r\n    #endif\r\n\r\n    mat4 modelViewMatrix=mvMatrix;\r\n    {{MODULE_VERTEX_MODELVIEW}}\r\n\r\n\r\n    gl_Position = projMatrix * modelViewMatrix * pos;\r\n}\r\n","snippet_body_ambient_frag":"    // * AMBIENT LIGHT {{LIGHT_INDEX}} *\r\n    vec3 diffuseColor{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.lightProperties.INTENSITY*phongLight{{LIGHT_INDEX}}.color;\r\n    calculatedColor += diffuseColor{{LIGHT_INDEX}};\r\n","snippet_body_directional_frag":"    // * DIRECTIONAL LIGHT {{LIGHT_INDEX}} *\r\n\r\n    if (phongLight{{LIGHT_INDEX}}.castLight == 1) {\r\n        vec3 phongLightDirection{{LIGHT_INDEX}} = normalize(phongLight{{LIGHT_INDEX}}.position);\r\n\r\n        float phongLambert{{LIGHT_INDEX}} = 1.; // inout variable\r\n\r\n        vec3 lightColor{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.color;\r\n        vec3 lightSpecular{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.specular;\r\n\r\n        #ifdef HAS_TEXTURES\r\n            #ifdef HAS_TEXTURE_AO\r\n                // lightColor{{LIGHT_INDEX}} *= mix(vec3(1.), texture(texAO, texCoord).rgb, inTextureIntensities.AO);\r\n                lightColor{{LIGHT_INDEX}} *= texture(texAO, tcAo).g, inTextureIntensities.AO;\r\n\r\n            #endif\r\n\r\n            #ifdef HAS_TEXTURE_SPECULAR\r\n                lightSpecular{{LIGHT_INDEX}} *= mix(1., texture(texSpecular, texCoord).r, inTextureIntensities.SPECULAR);\r\n            #endif\r\n        #endif\r\n\r\n        vec3 diffuseColor{{LIGHT_INDEX}} = CalculateDiffuseColor(phongLightDirection{{LIGHT_INDEX}}, viewDirection, normal, lightColor{{LIGHT_INDEX}}, baseColor, phongLambert{{LIGHT_INDEX}});\r\n        vec3 specularColor{{LIGHT_INDEX}} = CalculateSpecularColor(\r\n            lightSpecular{{LIGHT_INDEX}},\r\n            inMaterialProperties.SPECULAR_AMT,\r\n            inMaterialProperties.SHININESS,\r\n            phongLightDirection{{LIGHT_INDEX}},\r\n            viewDirection,\r\n            normal,\r\n            phongLambert{{LIGHT_INDEX}}\r\n        );\r\n\r\n        vec3 combinedColor{{LIGHT_INDEX}} = (diffuseColor{{LIGHT_INDEX}} + specularColor{{LIGHT_INDEX}});\r\n\r\n        vec3 lightModelDiff{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.position - fragPos.xyz;\r\n\r\n        combinedColor{{LIGHT_INDEX}} *= phongLight{{LIGHT_INDEX}}.lightProperties.INTENSITY;\r\n        calculatedColor += combinedColor{{LIGHT_INDEX}};\r\n    }","snippet_body_point_frag":"// * POINT LIGHT {{LIGHT_INDEX}} *\r\n    if (phongLight{{LIGHT_INDEX}}.castLight == 1) {\r\n        vec3 phongLightDirection{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.position - fragPos.xyz;\r\n        // * get length before normalization for falloff calculation\r\n        phongLightDirection{{LIGHT_INDEX}} = normalize(phongLightDirection{{LIGHT_INDEX}});\r\n        float phongLightDistance{{LIGHT_INDEX}} = length(phongLightDirection{{LIGHT_INDEX}});\r\n\r\n        float phongLambert{{LIGHT_INDEX}} = 1.; // inout variable\r\n\r\n        vec3 lightColor{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.color;\r\n        vec3 lightSpecular{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.specular;\r\n\r\n        #ifdef HAS_TEXTURES\r\n            #ifdef HAS_TEXTURE_AO\r\n                lightColor{{LIGHT_INDEX}} -= (1.0-texture(texAO, tcAo).g)* (inTextureIntensities.AO);\r\n            #endif\r\n\r\n            #ifdef HAS_TEXTURE_SPECULAR\r\n                lightSpecular{{LIGHT_INDEX}} *= mix(1., texture(texSpecular, texCoord).r, inTextureIntensities.SPECULAR);\r\n            #endif\r\n        #endif\r\n\r\n        vec3 diffuseColor{{LIGHT_INDEX}} = CalculateDiffuseColor(phongLightDirection{{LIGHT_INDEX}}, viewDirection, normal, lightColor{{LIGHT_INDEX}}, baseColor, phongLambert{{LIGHT_INDEX}});\r\n        vec3 specularColor{{LIGHT_INDEX}} = CalculateSpecularColor(\r\n            lightSpecular{{LIGHT_INDEX}},\r\n            inMaterialProperties.SPECULAR_AMT,\r\n            inMaterialProperties.SHININESS,\r\n            phongLightDirection{{LIGHT_INDEX}},\r\n            viewDirection,\r\n            normal,\r\n            phongLambert{{LIGHT_INDEX}}\r\n        );\r\n\r\n        vec3 combinedColor{{LIGHT_INDEX}} = (diffuseColor{{LIGHT_INDEX}} + specularColor{{LIGHT_INDEX}});\r\n\r\n        combinedColor{{LIGHT_INDEX}} *= phongLight{{LIGHT_INDEX}}.lightProperties.INTENSITY;\r\n\r\n        float attenuation{{LIGHT_INDEX}} = CalculateFalloff(\r\n            phongLightDistance{{LIGHT_INDEX}},\r\n            phongLightDirection{{LIGHT_INDEX}},\r\n            phongLight{{LIGHT_INDEX}}.lightProperties.FALLOFF,\r\n            phongLight{{LIGHT_INDEX}}.lightProperties.RADIUS\r\n        );\r\n\r\n        attenuation{{LIGHT_INDEX}} *= when_gt(phongLambert{{LIGHT_INDEX}}, 0.);\r\n        combinedColor{{LIGHT_INDEX}} *= attenuation{{LIGHT_INDEX}};\r\n\r\n        calculatedColor += combinedColor{{LIGHT_INDEX}};\r\n    }\r\n","snippet_body_spot_frag":"    // * SPOT LIGHT {{LIGHT_INDEX}} *\r\n    if (phongLight{{LIGHT_INDEX}}.castLight == 1) {\r\n        vec3 phongLightDirection{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.position - fragPos.xyz;\r\n        phongLightDirection{{LIGHT_INDEX}} = normalize( phongLightDirection{{LIGHT_INDEX}});\r\n        float phongLightDistance{{LIGHT_INDEX}} = length(phongLightDirection{{LIGHT_INDEX}});\r\n\r\n        float phongLambert{{LIGHT_INDEX}} = 1.; // inout variable\r\n\r\n        vec3 lightColor{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.color;\r\n        vec3 lightSpecular{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.specular;\r\n\r\n        #ifdef HAS_TEXTURES\r\n            #ifdef HAS_TEXTURE_AO\r\n                // lightColor{{LIGHT_INDEX}} *= mix(vec3(1.), texture(texAO, texCoord).rgb, inTextureIntensities.AO);\r\n                lightColor{{LIGHT_INDEX}} *= texture(texAO, texCoord).g, inTextureIntensities.AO;\r\n\r\n            #endif\r\n\r\n            #ifdef HAS_TEXTURE_SPECULAR\r\n                lightSpecular{{LIGHT_INDEX}} *= mix(1., texture(texSpecular, texCoord).r, inTextureIntensities.SPECULAR);\r\n            #endif\r\n        #endif\r\n\r\n        vec3 diffuseColor{{LIGHT_INDEX}} = CalculateDiffuseColor(phongLightDirection{{LIGHT_INDEX}}, viewDirection, normal, lightColor{{LIGHT_INDEX}}, baseColor, phongLambert{{LIGHT_INDEX}});\r\n        vec3 specularColor{{LIGHT_INDEX}} = CalculateSpecularColor(\r\n            lightSpecular{{LIGHT_INDEX}},\r\n            inMaterialProperties.SPECULAR_AMT,\r\n            inMaterialProperties.SHININESS,\r\n            phongLightDirection{{LIGHT_INDEX}},\r\n            viewDirection,\r\n            normal,\r\n            phongLambert{{LIGHT_INDEX}}\r\n        );\r\n\r\n        vec3 combinedColor{{LIGHT_INDEX}} = (diffuseColor{{LIGHT_INDEX}} + specularColor{{LIGHT_INDEX}});\r\n\r\n        float spotIntensity{{LIGHT_INDEX}} = CalculateSpotLightEffect(\r\n            phongLight{{LIGHT_INDEX}}.position, phongLight{{LIGHT_INDEX}}.conePointAt, phongLight{{LIGHT_INDEX}}.spotProperties.COSCONEANGLE,\r\n            phongLight{{LIGHT_INDEX}}.spotProperties.COSCONEANGLEINNER, phongLight{{LIGHT_INDEX}}.spotProperties.SPOTEXPONENT,\r\n            phongLightDirection{{LIGHT_INDEX}}\r\n        );\r\n\r\n        combinedColor{{LIGHT_INDEX}} *= spotIntensity{{LIGHT_INDEX}};\r\n\r\n        vec3 lightModelDiff{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.position - fragPos.xyz;\r\n\r\n        float attenuation{{LIGHT_INDEX}} = CalculateFalloff(\r\n            phongLightDistance{{LIGHT_INDEX}},\r\n            phongLightDirection{{LIGHT_INDEX}},\r\n            phongLight{{LIGHT_INDEX}}.lightProperties.FALLOFF,\r\n            phongLight{{LIGHT_INDEX}}.lightProperties.RADIUS\r\n        );\r\n\r\n        attenuation{{LIGHT_INDEX}} *= when_gt(phongLambert{{LIGHT_INDEX}}, 0.);\r\n\r\n        combinedColor{{LIGHT_INDEX}} *= attenuation{{LIGHT_INDEX}};\r\n\r\n        combinedColor{{LIGHT_INDEX}} *= phongLight{{LIGHT_INDEX}}.lightProperties.INTENSITY;\r\n        calculatedColor += combinedColor{{LIGHT_INDEX}};\r\n    }","snippet_head_frag":"UNI Light phongLight{{LIGHT_INDEX}};\r\n",};
const cgl = op.patch.cgl;

const attachmentFragmentHead = attachments.snippet_head_frag;
const snippets = {
    "point": attachments.snippet_body_point_frag,
    "spot": attachments.snippet_body_spot_frag,
    "ambient": attachments.snippet_body_ambient_frag,
    "directional": attachments.snippet_body_directional_frag,
    "area": attachments.snippet_body_area_frag,
};
const LIGHT_INDEX_REGEX = new RegExp("{{LIGHT_INDEX}}", "g");

const createFragmentHead = (n) => { return attachmentFragmentHead.replace("{{LIGHT_INDEX}}", n); };
const createFragmentBody = (n, type) => { return snippets[type].replace(LIGHT_INDEX_REGEX, n); };

function createDefaultShader()
{
    const vertexShader = attachments.phong_vert;
    let fragmentShader = attachments.phong_frag;

    let fragmentHead = createFragmentHead(0);
    let fragmentBody = createFragmentBody(0, DEFAULT_LIGHTSTACK[0].type);

    fragmentShader = fragmentShader.replace(FRAGMENT_HEAD_REGEX, fragmentHead);
    fragmentShader = fragmentShader.replace(FRAGMENT_BODY_REGEX, fragmentBody);

    shader.setSource(vertexShader, fragmentShader);
    shader.define("HAS_POINT");
    shader.removeDefine("HAS_SPOT");
    shader.removeDefine("HAS_DIRECTIONAL");
    shader.removeDefine("HAS_AMBIENT");
}

const inTrigger = op.inTrigger("Trigger In");

// * DIFFUSE *
const inDiffuseR = op.inFloat("R", Math.random());
const inDiffuseG = op.inFloat("G", Math.random());
const inDiffuseB = op.inFloat("B", Math.random());
const inDiffuseA = op.inFloatSlider("A", 1);
const diffuseColors = [inDiffuseR, inDiffuseG, inDiffuseB, inDiffuseA];
op.setPortGroup("Diffuse Color", diffuseColors);

const inToggleOrenNayar = op.inBool("Enable", false);
const inAlbedo = op.inFloatSlider("Albedo", 0.707);
const inRoughness = op.inFloatSlider("Roughness", 0.835);

inToggleOrenNayar.setUiAttribs({ "hidePort": true });
inAlbedo.setUiAttribs({ "greyout": true });
inRoughness.setUiAttribs({ "greyout": true });
inDiffuseR.setUiAttribs({ "colorPick": true });
op.setPortGroup("Oren-Nayar Diffuse", [inToggleOrenNayar, inAlbedo, inRoughness]);
op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_FUNCTION);

inToggleOrenNayar.onChange = function ()
{
    shader.toggleDefine("ENABLE_OREN_NAYAR_DIFFUSE", inToggleOrenNayar);
    inAlbedo.setUiAttribs({ "greyout": !inToggleOrenNayar.get() });
    inRoughness.setUiAttribs({ "greyout": !inToggleOrenNayar.get() });
};

// * FRESNEL *
const inToggleFresnel = op.inValueBool("Active", false);
inToggleFresnel.setUiAttribs({ "hidePort": true });
const inFresnel = op.inValueSlider("Fresnel Intensity", 0.7);
const inFresnelWidth = op.inFloat("Fresnel Width", 1);
const inFresnelExponent = op.inFloat("Fresnel Exponent", 6);
const inFresnelR = op.inFloat("Fresnel R", 1);
const inFresnelG = op.inFloat("Fresnel G", 1);
const inFresnelB = op.inFloat("Fresnel B", 1);
inFresnelR.setUiAttribs({ "colorPick": true });

const fresnelArr = [inFresnel, inFresnelWidth, inFresnelExponent, inFresnelR, inFresnelG, inFresnelB];
fresnelArr.forEach(function (port) { port.setUiAttribs({ "greyout": true }); });
op.setPortGroup("Fresnel", fresnelArr.concat([inToggleFresnel]));

let uniFresnel = null;
let uniFresnelWidthExponent = null;
inToggleFresnel.onChange = function ()
{
    shader.toggleDefine("ENABLE_FRESNEL", inToggleFresnel);
    if (inToggleFresnel.get())
    {
        if (!uniFresnel) uniFresnel = new CGL.Uniform(shader, "4f", "inFresnel", inFresnelR, inFresnelG, inFresnelB, inFresnel);
        if (!uniFresnelWidthExponent) uniFresnelWidthExponent = new CGL.Uniform(shader, "2f", "inFresnelWidthExponent", inFresnelWidth, inFresnelExponent);
    }
    else
    {
        if (uniFresnel)
        {
            shader.removeUniform("inFresnel");
            uniFresnel = null;
        }

        if (uniFresnelWidthExponent)
        {
            shader.removeUniform("inFresnelWidthExponent");
            uniFresnelWidthExponent = null;
        }
    }

    fresnelArr.forEach(function (port) { port.setUiAttribs({ "greyout": !inToggleFresnel.get() }); });
};
// * EMISSIVE *
const inEmissiveActive = op.inBool("Emissive Active", false);
const inEmissiveColorIntensity = op.inFloatSlider("Color Intensity", 0.3);
const inEmissiveR = op.inFloatSlider("Emissive R", Math.random());
const inEmissiveG = op.inFloatSlider("Emissive G", Math.random());
const inEmissiveB = op.inFloatSlider("Emissive B", Math.random());
inEmissiveR.setUiAttribs({ "colorPick": true });
op.setPortGroup("Emissive Color", [inEmissiveActive, inEmissiveColorIntensity, inEmissiveR, inEmissiveG, inEmissiveB]);

inEmissiveColorIntensity.setUiAttribs({ "greyout": !inEmissiveActive.get() });
inEmissiveR.setUiAttribs({ "greyout": !inEmissiveActive.get() });
inEmissiveG.setUiAttribs({ "greyout": !inEmissiveActive.get() });
inEmissiveB.setUiAttribs({ "greyout": !inEmissiveActive.get() });

let uniEmissiveColor = null;

inEmissiveActive.onChange = () =>
{
    shader.toggleDefine("ADD_EMISSIVE_COLOR", inEmissiveActive);

    if (inEmissiveActive.get())
    {
        uniEmissiveColor = new CGL.Uniform(shader, "4f", "inEmissiveColor", inEmissiveR, inEmissiveG, inEmissiveB, inEmissiveColorIntensity);
        inEmissiveTexture.setUiAttribs({ "greyout": false });
        inEmissiveMaskTexture.setUiAttribs({ "greyout": false });

        if (inEmissiveTexture.get()) inEmissiveIntensity.setUiAttribs({ "greyout": false });
        if (inEmissiveMaskTexture.get()) inEmissiveMaskIntensity.setUiAttribs({ "greyout": false });
    }
    else
    {
        op.log("ayayay");
        inEmissiveTexture.setUiAttribs({ "greyout": true });
        inEmissiveMaskTexture.setUiAttribs({ "greyout": true });
        inEmissiveIntensity.setUiAttribs({ "greyout": true });
        inEmissiveMaskIntensity.setUiAttribs({ "greyout": true });

        shader.removeUniform("inEmissiveColor");
        uniEmissiveColor = null;
    }

    if (inEmissiveTexture.get())
    {
        inEmissiveColorIntensity.setUiAttribs({ "greyout": true });
        inEmissiveR.setUiAttribs({ "greyout": true });
        inEmissiveG.setUiAttribs({ "greyout": true });
        inEmissiveB.setUiAttribs({ "greyout": true });
    }
    else
    {
        if (inEmissiveActive.get())
        {
            inEmissiveColorIntensity.setUiAttribs({ "greyout": false });
            inEmissiveR.setUiAttribs({ "greyout": false });
            inEmissiveG.setUiAttribs({ "greyout": false });
            inEmissiveB.setUiAttribs({ "greyout": false });
        }
        else
        {
            inEmissiveColorIntensity.setUiAttribs({ "greyout": true });
            inEmissiveR.setUiAttribs({ "greyout": true });
            inEmissiveG.setUiAttribs({ "greyout": true });
            inEmissiveB.setUiAttribs({ "greyout": true });
        }
    }
};
// * SPECULAR *
const inShininess = op.inFloat("Shininess", 4);
const inSpecularCoefficient = op.inFloatSlider("Specular Amount", 0.5);
const inSpecularMode = op.inSwitch("Specular Model", ["Blinn", "Schlick", "Phong", "Gauss"], "Blinn");

inSpecularMode.setUiAttribs({ "hidePort": true });
const specularColors = [inShininess, inSpecularCoefficient, inSpecularMode];
op.setPortGroup("Specular", specularColors);

// * LIGHT *
const inEnergyConservation = op.inValueBool("Energy Conservation", false);
const inToggleDoubleSided = op.inBool("Double Sided Material", false);
const inFalloffMode = op.inSwitch("Falloff Mode", ["A", "B", "C", "D"], "A");
inEnergyConservation.setUiAttribs({ "hidePort": true });
inToggleDoubleSided.setUiAttribs({ "hidePort": true });
inFalloffMode.setUiAttribs({ "hidePort": true });
inFalloffMode.onChange = () =>
{
    const MODES = ["A", "B", "C", "D"];
    shader.define("FALLOFF_MODE_" + inFalloffMode.get());
    MODES.filter((mode) => { return mode !== inFalloffMode.get(); })
        .forEach((mode) => { return shader.removeDefine("FALLOFF_MODE_" + mode); });
};

const lightProps = [inEnergyConservation, inToggleDoubleSided, inFalloffMode];
op.setPortGroup("Light Options", lightProps);

// TEXTURES
const inDiffuseTexture = op.inTexture("Diffuse Texture");
const inSpecularTexture = op.inTexture("Specular Texture");
const inNormalTexture = op.inTexture("Normal Map");
const inAoTexture = op.inTexture("AO Texture");
const inEmissiveTexture = op.inTexture("Emissive Texture");
const inEmissiveMaskTexture = op.inTexture("Emissive Mask");
const inAlphaTexture = op.inTexture("Opacity Texture");
const inEnvTexture = op.inTexture("Environment Map");
const inLuminanceMaskTexture = op.inTexture("Env Map Mask");
op.setPortGroup("Textures", [inDiffuseTexture, inSpecularTexture, inNormalTexture, inAoTexture, inEmissiveTexture, inEmissiveMaskTexture, inAlphaTexture, inEnvTexture, inLuminanceMaskTexture]);

// TEXTURE TRANSFORMS
const inColorizeTexture = op.inBool("Colorize Texture", false);
const inDiffuseRepeatX = op.inFloat("Diffuse Repeat X", 1);
const inDiffuseRepeatY = op.inFloat("Diffuse Repeat Y", 1);
const inTextureOffsetX = op.inFloat("Texture Offset X", 0);
const inTextureOffsetY = op.inFloat("Texture Offset Y", 0);

const inSpecularIntensity = op.inFloatSlider("Specular Intensity", 1);
const inNormalIntensity = op.inFloatSlider("Normal Map Intensity", 0.5);
const inAoIntensity = op.inFloatSlider("AO Intensity", 1);
const inAoChannel = op.inSwitch("AO UV Channel", ["1", "2"], 1);
const inEmissiveIntensity = op.inFloatSlider("Emissive Intensity", 1);
const inEmissiveMaskIntensity = op.inFloatSlider("Emissive Mask Intensity", 1);
const inEnvMapIntensity = op.inFloatSlider("Env Map Intensity", 1);
const inEnvMapBlend = op.inSwitch("Env Map Blend", ["Add", "Multiply", "Mix"], "Add");
const inLuminanceMaskIntensity = op.inFloatSlider("Env Mask Intensity", 1);

inColorizeTexture.setUiAttribs({ "hidePort": true });
op.setPortGroup("Texture Transforms", [inColorizeTexture, inDiffuseRepeatY, inDiffuseRepeatX, inTextureOffsetY, inTextureOffsetX]);
op.setPortGroup("Texture Intensities", [inNormalIntensity, inAoIntensity, inSpecularIntensity, inEmissiveIntensity, inEnvMapBlend, inEmissiveMaskIntensity, inEnvMapIntensity, inLuminanceMaskIntensity]);
const alphaMaskSource = op.inSwitch("Alpha Mask Source", ["Luminance", "R", "G", "B", "A"], "Luminance");
alphaMaskSource.setUiAttribs({ "greyout": true });

const discardTransPxl = op.inValueBool("Discard Transparent Pixels");
discardTransPxl.setUiAttribs({ "hidePort": true });

op.setPortGroup("Opacity Texture", [alphaMaskSource, discardTransPxl]);

inAoChannel.onChange =
    inEnvMapBlend.onChange =
    alphaMaskSource.onChange = updateDefines;

const outTrigger = op.outTrigger("Trigger Out");
const shaderOut = op.outObject("Shader", null, "shader");
shaderOut.ignoreValueSerialize = true;

const shader = new CGL.Shader(cgl, "phongmaterial_" + op.id, this);
shader.op = this;
shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG", "MODULE_BASE_COLOR", "MODULE_VERTEX_MODELVIEW"]);
shader.setSource(attachments.simosphong_vert, attachments.simosphong_frag);
// let recompileShader = false;
shader.define("FALLOFF_MODE_A");

if (cgl.glVersion < 2)
{
    shader.enableExtension("GL_OES_standard_derivatives");

    if (cgl.enableExtension("OES_texture_float")) shader.enableExtension("GL_OES_texture_float");
    else op.log("error loading extension OES_texture_float");

    if (cgl.enableExtension("OES_texture_float_linear")) shader.enableExtension("GL_OES_texture_float_linear");
    else op.log("error loading extention OES_texture_float_linear");

    if (cgl.enableExtension("GL_OES_texture_half_float")) shader.enableExtension("GL_OES_texture_half_float");
    else op.log("error loading extention GL_OES_texture_half_float");

    if (cgl.enableExtension("GL_OES_texture_half_float_linear")) shader.enableExtension("GL_OES_texture_half_float_linear");
    else op.log("error loading extention GL_OES_texture_half_float_linear");
}

const FRAGMENT_HEAD_REGEX = new RegExp("{{PHONG_FRAGMENT_HEAD}}", "g");
const FRAGMENT_BODY_REGEX = new RegExp("{{PHONG_FRAGMENT_BODY}}", "g");

const hasLight = {
    "directional": false,
    "spot": false,
    "ambient": false,
    "point": false,
};

function createShader(lightStack)
{
    let fragmentShader = attachments.phong_frag;

    let fragmentHead = "";
    let fragmentBody = "";

    hasLight.directional = false;
    hasLight.spot = false;
    hasLight.ambient = false;
    hasLight.point = false;

    for (let i = 0; i < lightStack.length; i += 1)
    {
        const light = lightStack[i];

        const type = light.type;

        if (!hasLight[type])
        {
            hasLight[type] = true;
        }

        fragmentHead = fragmentHead.concat(createFragmentHead(i));
        fragmentBody = fragmentBody.concat(createFragmentBody(i, light.type));
    }

    fragmentShader = fragmentShader.replace(FRAGMENT_HEAD_REGEX, fragmentHead);
    fragmentShader = fragmentShader.replace(FRAGMENT_BODY_REGEX, fragmentBody);

    shader.setSource(attachments.phong_vert, fragmentShader);

    for (let i = 0, keys = Object.keys(hasLight); i < keys.length; i += 1)
    {
        const key = keys[i];

        if (hasLight[key])
        {
            if (!shader.hasDefine("HAS_" + key.toUpperCase()))
            {
                shader.define("HAS_" + key.toUpperCase());
            }
        }
        else
        {
            if (shader.hasDefine("HAS_" + key.toUpperCase()))
            {
                shader.removeDefine("HAS_" + key.toUpperCase());
            }
        }
    }
}

shaderOut.setRef(shader);

let diffuseTextureUniform = null;
let specularTextureUniform = null;
let normalTextureUniform = null;
let aoTextureUniform = null;
let emissiveTextureUniform = null;
let emissiveMaskTextureUniform = null;
let emissiveMaskIntensityUniform = null;
let alphaTextureUniform = null;
let envTextureUniform = null;
let inEnvMapIntensityUni = null;
let inEnvMapWidthUni = null;
let luminanceTextureUniform = null;
let inLuminanceMaskIntensityUniform = null;

inColorizeTexture.onChange = function ()
{
    shader.toggleDefine("COLORIZE_TEXTURE", inColorizeTexture.get());
};

function updateDiffuseTexture()
{
    if (inDiffuseTexture.get())
    {
        if (!shader.hasDefine("HAS_TEXTURE_DIFFUSE"))
        {
            shader.define("HAS_TEXTURE_DIFFUSE");
            if (!diffuseTextureUniform) diffuseTextureUniform = new CGL.Uniform(shader, "t", "texDiffuse", 0);
        }
    }
    else
    {
        shader.removeUniform("texDiffuse");
        shader.removeDefine("HAS_TEXTURE_DIFFUSE");
        diffuseTextureUniform = null;
    }
}

function updateSpecularTexture()
{
    if (inSpecularTexture.get())
    {
        inSpecularIntensity.setUiAttribs({ "greyout": false });
        if (!shader.hasDefine("HAS_TEXTURE_SPECULAR"))
        {
            shader.define("HAS_TEXTURE_SPECULAR");
            if (!specularTextureUniform) specularTextureUniform = new CGL.Uniform(shader, "t", "texSpecular", 0);
        }
    }
    else
    {
        inSpecularIntensity.setUiAttribs({ "greyout": true });
        shader.removeUniform("texSpecular");
        shader.removeDefine("HAS_TEXTURE_SPECULAR");
        specularTextureUniform = null;
    }
}

function updateNormalTexture()
{
    if (inNormalTexture.get())
    {
        inNormalIntensity.setUiAttribs({ "greyout": false });

        if (!shader.hasDefine("HAS_TEXTURE_NORMAL"))
        {
            shader.define("HAS_TEXTURE_NORMAL");
            if (!normalTextureUniform) normalTextureUniform = new CGL.Uniform(shader, "t", "texNormal", 0);
        }
    }
    else
    {
        inNormalIntensity.setUiAttribs({ "greyout": true });

        shader.removeUniform("texNormal");
        shader.removeDefine("HAS_TEXTURE_NORMAL");
        normalTextureUniform = null;
    }
}

aoTextureUniform = new CGL.Uniform(shader, "t", "texAO");

function updateAoTexture()
{
    shader.toggleDefine("HAS_TEXTURE_AO", inAoTexture.get());

    inAoIntensity.setUiAttribs({ "greyout": !inAoTexture.get() });

    // if (inAoTexture.get())
    // {
    //     // inAoIntensity.setUiAttribs({ "greyout": false });

    //     // if (!shader.hasDefine("HAS_TEXTURE_AO"))
    //     // {
    //         // shader.define("HAS_TEXTURE_AO");
    //         // if (!aoTextureUniform)
    //         aoTextureUniform = new CGL.Uniform(shader, "t", "texAO", 0);
    //     // }
    // }
    // else
    // {
    //     // inAoIntensity.setUiAttribs({ "greyout": true });

    //     shader.removeUniform("texAO");
    //     // shader.removeDefine("HAS_TEXTURE_AO");
    //     aoTextureUniform = null;
    // }
}

function updateEmissiveTexture()
{
    if (inEmissiveTexture.get())
    {
        inEmissiveR.setUiAttribs({ "greyout": true });
        inEmissiveG.setUiAttribs({ "greyout": true });
        inEmissiveB.setUiAttribs({ "greyout": true });
        inEmissiveColorIntensity.setUiAttribs({ "greyout": true });

        if (inEmissiveActive.get())
        {
            inEmissiveIntensity.setUiAttribs({ "greyout": false });
        }

        if (!shader.hasDefine("HAS_TEXTURE_EMISSIVE"))
        {
            shader.define("HAS_TEXTURE_EMISSIVE");
            if (!emissiveTextureUniform) emissiveTextureUniform = new CGL.Uniform(shader, "t", "texEmissive", 0);
        }
    }
    else
    {
        inEmissiveIntensity.setUiAttribs({ "greyout": true });

        if (inEmissiveActive.get())
        {
            inEmissiveR.setUiAttribs({ "greyout": false });
            inEmissiveG.setUiAttribs({ "greyout": false });
            inEmissiveB.setUiAttribs({ "greyout": false });
            inEmissiveColorIntensity.setUiAttribs({ "greyout": false });
        }
        else
        {
            inEmissiveTexture.setUiAttribs({ "greyout": true });
        }

        shader.removeUniform("texEmissive");
        shader.removeDefine("HAS_TEXTURE_EMISSIVE");
        emissiveTextureUniform = null;
    }
}

function updateEmissiveMaskTexture()
{
    if (inEmissiveMaskTexture.get())
    { // we have a emissive texture
        if (inEmissiveActive.get())
        {
            inEmissiveMaskIntensity.setUiAttribs({ "greyout": false });
        }

        if (!shader.hasDefine("HAS_TEXTURE_EMISSIVE_MASK"))
        {
            shader.define("HAS_TEXTURE_EMISSIVE_MASK");
            if (!emissiveMaskTextureUniform) emissiveMaskTextureUniform = new CGL.Uniform(shader, "t", "texMaskEmissive", 0);
            if (!emissiveMaskIntensityUniform) emissiveMaskIntensityUniform = new CGL.Uniform(shader, "f", "inEmissiveMaskIntensity", inEmissiveMaskIntensity);
        }
    }
    else
    {
        if (!inEmissiveActive.get())
        {
            inEmissiveMaskTexture.setUiAttribs({ "greyout": true });
        }
        inEmissiveMaskIntensity.setUiAttribs({ "greyout": true });
        shader.removeUniform("texMaskEmissive");
        shader.removeUniform("inEmissiveMaskIntensity");
        shader.removeDefine("HAS_TEXTURE_EMISSIVE_MASK");
        emissiveMaskTextureUniform = null;
        emissiveMaskIntensityUniform = null;
    }
}

let updateEnvTextureLater = false;
function updateEnvTexture()
{
    shader.toggleDefine("HAS_TEXTURE_ENV", inEnvTexture.get());

    inEnvMapIntensity.setUiAttribs({ "greyout": !inEnvTexture.get() });

    if (inEnvTexture.get())
    {
        if (!envTextureUniform) envTextureUniform = new CGL.Uniform(shader, "t", "texEnv", 0);

        shader.toggleDefine("TEX_FORMAT_CUBEMAP", inEnvTexture.get().cubemap);

        if (inEnvTexture.get().cubemap)
        {
            shader.removeDefine("TEX_FORMAT_EQUIRECT");
            shader.removeDefine("ENVMAP_MATCAP");
            if (!inEnvMapIntensityUni)inEnvMapIntensityUni = new CGL.Uniform(shader, "f", "inEnvMapIntensity", inEnvMapIntensity);
            if (!inEnvMapWidthUni)inEnvMapWidthUni = new CGL.Uniform(shader, "f", "inEnvMapWidth", inEnvTexture.get().cubemap.width);
        }
        else
        {
            const isSquare = inEnvTexture.get().width === inEnvTexture.get().height;
            shader.toggleDefine("TEX_FORMAT_EQUIRECT", !isSquare);
            shader.toggleDefine("ENVMAP_MATCAP", isSquare);

            if (!inEnvMapIntensityUni)inEnvMapIntensityUni = new CGL.Uniform(shader, "f", "inEnvMapIntensity", inEnvMapIntensity);
            if (!inEnvMapWidthUni) inEnvMapWidthUni = new CGL.Uniform(shader, "f", "inEnvMapWidth", inEnvTexture.get().width);
        }
    }
    else
    {
        shader.removeUniform("inEnvMapIntensity");
        shader.removeUniform("inEnvMapWidth");
        shader.removeUniform("texEnv");
        shader.removeDefine("HAS_TEXTURE_ENV");
        shader.removeDefine("ENVMAP_MATCAP");
        envTextureUniform = null;
        inEnvMapIntensityUni = null;
    }

    updateEnvTextureLater = false;
}

function updateLuminanceMaskTexture()
{
    if (inLuminanceMaskTexture.get())
    {
        inLuminanceMaskIntensity.setUiAttribs({ "greyout": false });
        if (!luminanceTextureUniform)
        {
            shader.define("HAS_TEXTURE_LUMINANCE_MASK");
            luminanceTextureUniform = new CGL.Uniform(shader, "t", "texLuminance", 0);
            inLuminanceMaskIntensityUniform = new CGL.Uniform(shader, "f", "inLuminanceMaskIntensity", inLuminanceMaskIntensity);
        }
    }
    else
    {
        inLuminanceMaskIntensity.setUiAttribs({ "greyout": true });
        shader.removeDefine("HAS_TEXTURE_LUMINANCE_MASK");
        shader.removeUniform("inLuminanceMaskIntensity");
        shader.removeUniform("texLuminance");
        luminanceTextureUniform = null;
        inLuminanceMaskIntensityUniform = null;
    }
}

// TEX OPACITY

function updateDefines()
{
    shader.toggleDefine("ENV_BLEND_ADD", inEnvMapBlend.get() == "Add");
    shader.toggleDefine("ENV_BLEND_MUL", inEnvMapBlend.get() == "Multiply");
    shader.toggleDefine("ENV_BLEND_MIX", inEnvMapBlend.get() == "Mix");

    shader.toggleDefine("ALPHA_MASK_ALPHA", alphaMaskSource.get() == "A" || alphaMaskSource.get() == "Alpha");
    shader.toggleDefine("ALPHA_MASK_LUMI", alphaMaskSource.get() == "Luminance");
    shader.toggleDefine("ALPHA_MASK_R", alphaMaskSource.get() == "R");
    shader.toggleDefine("ALPHA_MASK_G", alphaMaskSource.get() == "G");
    shader.toggleDefine("ALPHA_MASK_B", alphaMaskSource.get() == "B");

    shader.toggleDefine("AO_CHAN_0", inAoChannel.get() == "1");
    shader.toggleDefine("AO_CHAN_1", inAoChannel.get() == "2");
}

function updateAlphaTexture()
{
    if (inAlphaTexture.get())
    {
        if (alphaTextureUniform !== null) return;
        shader.removeUniform("texAlpha");
        shader.define("HAS_TEXTURE_ALPHA");
        if (!alphaTextureUniform) alphaTextureUniform = new CGL.Uniform(shader, "t", "texAlpha", 0);

        alphaMaskSource.setUiAttribs({ "greyout": false });
        discardTransPxl.setUiAttribs({ "greyout": false });
    }
    else
    {
        shader.removeUniform("texAlpha");
        shader.removeDefine("HAS_TEXTURE_ALPHA");
        alphaTextureUniform = null;

        alphaMaskSource.setUiAttribs({ "greyout": true });
        discardTransPxl.setUiAttribs({ "greyout": true });
    }
    updateDefines();
}

discardTransPxl.onChange = function ()
{
    shader.toggleDefine("DISCARDTRANS", discardTransPxl.get());
};

inDiffuseTexture.onChange = updateDiffuseTexture;
inSpecularTexture.onChange = updateSpecularTexture;
inNormalTexture.onChange = updateNormalTexture;
inAoTexture.onChange = updateAoTexture;
inEmissiveTexture.onChange = updateEmissiveTexture;
inEmissiveMaskTexture.onChange = updateEmissiveMaskTexture;
inAlphaTexture.onChange = updateAlphaTexture;
inEnvTexture.onChange = () => { updateEnvTextureLater = true; };
inLuminanceMaskTexture.onChange = updateLuminanceMaskTexture;

const MAX_UNIFORM_FRAGMENTS = cgl.maxUniformsFrag;
const MAX_LIGHTS = MAX_UNIFORM_FRAGMENTS === 64 ? 6 : 16;

shader.define("MAX_LIGHTS", MAX_LIGHTS.toString());
shader.define("SPECULAR_PHONG");

inSpecularMode.onChange = function ()
{
    if (inSpecularMode.get() === "Phong")
    {
        shader.define("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_GAUSS");
        shader.removeDefine("SPECULAR_SCHLICK");
    }
    else if (inSpecularMode.get() === "Blinn")
    {
        shader.define("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_GAUSS");
        shader.removeDefine("SPECULAR_SCHLICK");
    }
    else if (inSpecularMode.get() === "Gauss")
    {
        shader.define("SPECULAR_GAUSS");
        shader.removeDefine("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_SCHLICK");
    }
    else if (inSpecularMode.get() === "Schlick")
    {
        shader.define("SPECULAR_SCHLICK");
        shader.removeDefine("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_GAUSS");
    }
};

inEnergyConservation.onChange = function ()
{
    shader.toggleDefine("CONSERVE_ENERGY", inEnergyConservation.get());
};

inToggleDoubleSided.onChange = function ()
{
    shader.toggleDefine("DOUBLE_SIDED", inToggleDoubleSided.get());
};

// * INIT UNIFORMS *

const uniMaterialProps = new CGL.Uniform(shader, "4f", "inMaterialProperties", inAlbedo, inRoughness, inShininess, inSpecularCoefficient);
const uniDiffuseColor = new CGL.Uniform(shader, "4f", "inDiffuseColor", inDiffuseR, inDiffuseG, inDiffuseB, inDiffuseA);
const uniTextureIntensities = new CGL.Uniform(shader, "4f", "inTextureIntensities", inNormalIntensity, inAoIntensity, inSpecularIntensity, inEmissiveIntensity);
const uniTextureRepeatOffset = new CGL.Uniform(shader, "4f", "inTextureRepeatOffset", inDiffuseRepeatX, inDiffuseRepeatY, inTextureOffsetX, inTextureOffsetY);

shader.uniformColorDiffuse = uniDiffuseColor;

const lightUniforms = [];
let oldCount = 0;

function createUniforms(lightsCount)
{
    for (let i = 0; i < lightUniforms.length; i += 1)
    {
        lightUniforms[i] = null;
    }

    for (let i = 0; i < lightsCount; i += 1)
    {
        lightUniforms[i] = null;
        if (!lightUniforms[i])
        {
            lightUniforms[i] = {
                "color": new CGL.Uniform(shader, "3f", "phongLight" + i + ".color", [1, 1, 1]),
                "position": new CGL.Uniform(shader, "3f", "phongLight" + i + ".position", [0, 11, 0]),
                "specular": new CGL.Uniform(shader, "3f", "phongLight" + i + ".specular", [1, 1, 1]),
                // intensity, attenuation, falloff, radius
                "lightProperties": new CGL.Uniform(shader, "4f", "phongLight" + i + ".lightProperties", [1, 1, 1, 1]),

                "conePointAt": new CGL.Uniform(shader, "3f", "phongLight" + i + ".conePointAt", vec3.create()),
                "spotProperties": new CGL.Uniform(shader, "3f", "phongLight" + i + ".spotProperties", [0, 0, 0, 0]),
                "castLight": new CGL.Uniform(shader, "i", "phongLight" + i + ".castLight", 1),

            };
        }
    }
}

function setDefaultUniform(light)
{
    defaultUniform.position.setValue(light.position);
    defaultUniform.color.setValue(light.color);
    defaultUniform.specular.setValue(light.specular);
    defaultUniform.lightProperties.setValue([
        light.intensity,
        light.attenuation,
        light.falloff,
        light.radius,
    ]);

    defaultUniform.conePointAt.setValue(light.conePointAt);
    defaultUniform.spotProperties.setValue([
        light.cosConeAngle,
        light.cosConeAngleInner,
        light.spotExponent,
    ]);
}

function setUniforms(lightStack)
{
    for (let i = 0; i < lightStack.length; i += 1)
    {
        const light = lightStack[i];
        light.isUsed = true;

        lightUniforms[i].position.setValue(light.position);
        lightUniforms[i].color.setValue(light.color);
        lightUniforms[i].specular.setValue(light.specular);

        lightUniforms[i].lightProperties.setValue([
            light.intensity,
            light.attenuation,
            light.falloff,
            light.radius,
        ]);

        lightUniforms[i].conePointAt.setValue(light.conePointAt);
        lightUniforms[i].spotProperties.setValue([
            light.cosConeAngle,
            light.cosConeAngleInner,
            light.spotExponent,
        ]);

        lightUniforms[i].castLight.setValue(light.castLight);
    }
}

function compareLights(lightStack)
{
    if (lightStack.length !== oldCount)
    {
        createShader(lightStack);
        createUniforms(lightStack.length);
        oldCount = lightStack.length;
        setUniforms(lightStack);
        // recompileShader = false;
    }
    else
    {
        // if (recompileShader)
        // {
        //     createShader(lightStack);
        //     createUniforms(lightStack.length);
        //     recompileShader = false;
        // }
        setUniforms(lightStack);
    }
}

let defaultUniform = null;

function createDefaultUniform()
{
    defaultUniform = {
        "color": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".color", [1, 1, 1]),
        "specular": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".specular", [1, 1, 1]),
        "position": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".position", [0, 11, 0]),
        // intensity, attenuation, falloff, radius
        "lightProperties": new CGL.Uniform(shader, "4f", "phongLight" + 0 + ".lightProperties", [1, 1, 1, 1]),
        "conePointAt": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".conePointAt", vec3.create()),
        "spotProperties": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".spotProperties", [0, 0, 0, 0]),
        "castLight": new CGL.Uniform(shader, "i", "phongLight" + 0 + ".castLight", 1),
    };
}

const DEFAULT_LIGHTSTACK = [{
    "type": "point",
    "position": [5, 5, 5],
    "color": [1, 1, 1],
    "specular": [1, 1, 1],
    "intensity": 1,
    "attenuation": 0,
    "falloff": 0.5,
    "radius": 80,
    "castLight": 1,
}];

const iViewMatrix = mat4.create();

function updateLights()
{
    if (cgl.tempData.lightStack)
    {
        if (cgl.tempData.lightStack.length === 0)
        {
            op.setUiError("deflight", "Default light is enabled. Please add lights to your patch to make this warning disappear.", 1);
        }
        else op.setUiError("deflight", null);
    }

    if ((!cgl.tempData.lightStack || !cgl.tempData.lightStack.length))
    {
        // if no light in light stack, use default light & set count to -1
        // so when a new light gets added, the shader does recompile
        if (!defaultUniform)
        {
            createDefaultShader();
            createDefaultUniform();
        }

        mat4.invert(iViewMatrix, cgl.vMatrix);
        // set default light position to camera position
        DEFAULT_LIGHTSTACK[0].position = [iViewMatrix[12], iViewMatrix[13], iViewMatrix[14]];
        setDefaultUniform(DEFAULT_LIGHTSTACK[0]);

        oldCount = -1;
    }
    else
    {
        if (shader)
        {
            if (cgl.tempData.lightStack)
            {
                if (cgl.tempData.lightStack.length)
                {
                    defaultUniform = null;
                    compareLights(cgl.tempData.lightStack);
                }
            }
        }
    }
}

const render = function ()
{
    if (!shader)
    {
        op.log("NO SHADER");
        return;
    }

    cgl.pushShader(shader);
    shader.popTextures();

    outTrigger.trigger();
    cgl.popShader();
};

op.preRender = function ()
{
    shader.bind();
    render();
};

/* transform for default light */
const inverseViewMat = mat4.create();
const vecTemp = vec3.create();
const camPos = vec3.create();

inTrigger.onTriggered = function ()
{
    if (!shader)
    {
        op.log("phong has no shader...");
        return;
    }

    if (updateEnvTextureLater)updateEnvTexture();

    cgl.pushShader(shader);

    shader.popTextures();

    if (inDiffuseTexture.get()) shader.pushTexture(diffuseTextureUniform, inDiffuseTexture.get());
    if (inSpecularTexture.get()) shader.pushTexture(specularTextureUniform, inSpecularTexture.get());
    if (inNormalTexture.get()) shader.pushTexture(normalTextureUniform, inNormalTexture.get());
    if (inAoTexture.get()) shader.pushTexture(aoTextureUniform, inAoTexture.get());
    if (inEmissiveTexture.get()) shader.pushTexture(emissiveTextureUniform, inEmissiveTexture.get());
    if (inEmissiveMaskTexture.get()) shader.pushTexture(emissiveMaskTextureUniform, inEmissiveMaskTexture.get());
    if (inAlphaTexture.get()) shader.pushTexture(alphaTextureUniform, inAlphaTexture.get());
    if (inEnvTexture.get())
    {
        if (inEnvTexture.get().cubemap) shader.pushTexture(envTextureUniform, inEnvTexture.get().cubemap, cgl.gl.TEXTURE_CUBE_MAP);
        else shader.pushTexture(envTextureUniform, inEnvTexture.get());
    }

    if (inLuminanceMaskTexture.get())
    {
        shader.pushTexture(luminanceTextureUniform, inLuminanceMaskTexture.get());
    }

    updateLights();

    outTrigger.trigger();

    cgl.popShader();
};

if (cgl.glVersion == 1)
{
    if (!cgl.enableExtension("EXT_shader_texture_lod"))
    {
        op.log("no EXT_shader_texture_lod texture extension");
        // throw "no EXT_shader_texture_lod texture extension";
    }
    else
    {
        shader.enableExtension("GL_EXT_shader_texture_lod");
        cgl.enableExtension("OES_texture_float");
        cgl.enableExtension("OES_texture_float_linear");
        cgl.enableExtension("OES_texture_half_float");
        cgl.enableExtension("OES_texture_half_float_linear");

        shader.enableExtension("GL_OES_standard_derivatives");
        shader.enableExtension("GL_OES_texture_float");
        shader.enableExtension("GL_OES_texture_float_linear");
        shader.enableExtension("GL_OES_texture_half_float");
        shader.enableExtension("GL_OES_texture_half_float_linear");
    }
}

updateDiffuseTexture();
updateSpecularTexture();
updateNormalTexture();
updateAoTexture();
updateAlphaTexture();
updateEmissiveTexture();
updateEmissiveMaskTexture();
updateEnvTexture();
updateLuminanceMaskTexture();

}
};

CABLES.OPS["0d83ed06-cdbe-4fe0-87bb-0ccece7fb6e1"]={f:Ops.Gl.Phong.PhongMaterial_v6,objName:"Ops.Gl.Phong.PhongMaterial_v6"};



window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});
