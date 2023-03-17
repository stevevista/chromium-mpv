if(CMAKE_CXX_COMPILER_ID STREQUAL "MSVC")
    include(CheckCXXCompilerFlag)
    set(CMAKE_REQUIRED_QUIET ON)
    check_cxx_compiler_flag("/Zc:__cplusplus" res_var)
    if (res_var)
        # Make MSVC reporting correct value for __cplusplus
        # See https://blogs.msdn.microsoft.com/vcblog/2018/04/09/msvc-now-correctly-reports-__cplusplus/
        add_compile_options("/Zc:__cplusplus")
    endif()

    set(CompilerFlags
        CMAKE_CXX_FLAGS
        CMAKE_CXX_FLAGS_DEBUG
        CMAKE_CXX_FLAGS_RELEASE
        CMAKE_C_FLAGS
        CMAKE_C_FLAGS_DEBUG
        CMAKE_C_FLAGS_RELEASE
        )
    foreach(CompilerFlag ${CompilerFlags})
        string(REPLACE "/MD" "/MT" ${CompilerFlag} "${${CompilerFlag}}")
    endforeach()
endif()
