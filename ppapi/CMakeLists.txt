
# cmake -G "Visual Studio 16" -A x64 .. -DNAC_SDK_DIR=D:\dev\nacl_sdk
# cmake --build . --config Release -- /p:CharacterSet=Unicode

cmake_minimum_required(VERSION 3.9)

cmake_policy(SET CMP0091 NEW)

project(x-mpv)

set (CMAKE_CXX_STANDARD 17)

set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

set (CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake;${CMAKE_MODULE_PATH}")
set (THIRD_PARTY_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../third_party")

set (LIBMPV_INC "${THIRD_PARTY_DIR}/mpv-dev-x86_64-20221106-git-2590651/include")
set (LIBMPV_LIB "${THIRD_PARTY_DIR}/mpv-dev-x86_64-20221106-git-2590651/mpv.lib")
set (LIBMPV_DLL "${THIRD_PARTY_DIR}/mpv-dev-x86_64-20221106-git-2590651/mpv-2.dll")

if (WIN32)
  if (CMAKE_CL_64)
    set(ARCHSUFFIX "win32-x64")
  else()
    set(ARCHSUFFIX "win32-x86")
  endif()
else()
  set(ARCHSUFFIX "linux-x64")
endif()


find_package(NACL_SDK REQUIRED)

# ====================================================
# global flags
# ====================================================

if (MSVC)
  add_definitions(
        -D_WIN32_WINNT=0x0602
        -D_CRT_SECURE_NO_WARNINGS
        -DNDEBUG)
endif()


set(PEPPER_PLAYER "mpv-${ARCHSUFFIX}-${NACL_PEPPER_VERSON}")

add_library(${PEPPER_PLAYER} SHARED
    pepper.cc)

target_compile_definitions(${PEPPER_PLAYER} PRIVATE _WIN32_WINNT=0x0602 COBJMACROS)

target_include_directories(${PEPPER_PLAYER} PRIVATE
    ${NACL_PEPPER_INCLUDE_PATH}
    ${LIBMPV_INC})

target_link_directories(${PEPPER_PLAYER} PRIVATE
    ${NACL_PEPPER_LIB_PATH})

target_link_libraries(${PEPPER_PLAYER} PRIVATE
    ${LIBMPV_LIB}
    ppapi_cpp
    ppapi_gles2)

if (MSVC)
  set_property(TARGET ${PEPPER_PLAYER} PROPERTY
               MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()


# ====================================================
# copy to root directory
# ====================================================

add_custom_target(CopyDepends ALL 
    VERBATIM 
    COMMAND_EXPAND_LISTS 
    COMMAND ${CMAKE_COMMAND} -E 
      copy_if_different
          "${LIBMPV_DLL}"
          "${CMAKE_BINARY_DIR}/$<$<CONFIG:Debug>:Debug>$<$<CONFIG:Release>:Release>")
